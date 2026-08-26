/**
 * PsdSlim.jsx — PSD 精准瘦身工具
 * 适用 Photoshop CC2019 及以上（ExtendScript / ES3 语法）
 *
 * 它解决通用清理脚本查不出的两类真问题：
 *   ① 幽灵层：图层标称边界被撑到整张画布，实际内容只有几十像素。
 *      一个 6700x11387 的幽灵层在内存里是 305MB，滚动一下 PS 就得重算一遍。
 *   ② 疯狂路径层：形状图层的矢量蒙版有几万个锚点（通常是「选区→建立工作路径」的产物），
 *      每次重绘都要重新光栅化。
 * 外加：存盘时关掉「最大化兼容」，省下和图层数据同量级的合成图。
 *
 * 【安全保证】原文件永不被修改。脚本第一步就另存出 _lite 副本，此后所有操作都在副本上。
 *
 * 用法：Photoshop → 文件 → 脚本 → 浏览… → 选择本文件
 */

#target photoshop

// ══════════════════════════════════════════════════════════════
//  配置区（想改行为就改这里）
// ══════════════════════════════════════════════════════════════
var CFG = {
    // 只诊断、不改任何东西。第一次用建议先设 true 看看报告。
    reportOnly: false,

    // ① 重建幽灵层边界。零视觉损失。
    fixGhostBounds: true,
    // 图层标称面积达到画布面积的这个比例，才视为幽灵层候选
    ghostAreaRatio: 0.80,
    // 只处理「干净」的层：无样式 / 无蒙版 / 无剪贴 / 100%不透明 / 正常混合 / 可见。
    // 强烈建议保持 true —— 这是「无损」的前提。
    ghostSafeOnly: true,

    // ② 栅格化重路径形状层。视觉几乎无损，代价是之后不能再拖锚点改形状。
    rasterizeHeavyShapes: true,
    // 形状图层边界面积超过这个值才栅格化（800x800）。小图标形状一律放过。
    shapeAreaThreshold: 640000,

    // ③ 删除完全空的图层
    deleteEmptyLayers: true,

    // ④ 存盘时关闭「最大化兼容」。省一大块，PS 自己打开毫无影响。
    disableMaxCompat: true,

    // ⑤ 删除文档级的 Alpha 通道（存储的选区）。默认 false —— 那可能是你留着有用的。
    //    报告里会列出有哪些，你自己判断后再决定要不要开。
    deleteAlphaChannels: false,

    // 副本文件名后缀
    suffix: "_lite",

    // 写一份 txt 日志到副本旁边
    writeLog: true,

    // 静默模式：不弹任何窗，结果只写日志。供外部批量调用用，手动运行时保持 false。
    silent: false
};

// 允许外部 wrapper 覆盖配置：
//   wrapper 里先 var PSDSLIM_OVERRIDE = {silent:true, ...}; 再 $.evalFile(本文件)
if (typeof PSDSLIM_OVERRIDE !== "undefined") {
    for (var _k in PSDSLIM_OVERRIDE) { CFG[_k] = PSDSLIM_OVERRIDE[_k]; }
}

// ══════════════════════════════════════════════════════════════
//  工具函数
// ══════════════════════════════════════════════════════════════
var LOG = [];
function log(s) { LOG.push(s); }

function s2t(s) { return stringIDToTypeID(s); }

function fmtMB(bytes) { return (bytes / 1048576).toFixed(1) + " MB"; }

function pad(s, n) {
    s = String(s);
    while (s.length < n) { s += " "; }
    return s;
}

/** 取当前活动图层的完整 ActionDescriptor（用来读 DOM 拿不到的属性） */
function activeLayerDesc() {
    var r = new ActionReference();
    r.putEnumerated(s2t("layer"), s2t("ordinal"), s2t("targetEnum"));
    return executeActionGet(r);
}

/** 读一个布尔属性，读不到就当 false */
function descBool(d, key) {
    try {
        var k = s2t(key);
        if (d.hasKey(k)) { return d.getBoolean(k); }
    } catch (e) {}
    return false;
}

/** 图层是否带图层样式（DOM 读不到，只能走 ActionManager） */
function descHasEffects(d) {
    try { return d.hasKey(s2t("layerEffects")); } catch (e) { return false; }
}

/** 面积（像素），bounds 是 UnitValue 数组 */
function boundsArea(b) {
    var w = b[2].as("px") - b[0].as("px");
    var h = b[3].as("px") - b[1].as("px");
    if (w < 0) { w = 0; }
    if (h < 0) { h = 0; }
    return w * h;
}
function boundsW(b) { return Math.round(b[2].as("px") - b[0].as("px")); }
function boundsH(b) { return Math.round(b[3].as("px") - b[1].as("px")); }

/** 递归收集所有 artLayer 引用（先收集再操作，避免遍历中集合变化） */
function collectLayers(container, out) {
    var i;
    for (i = 0; i < container.artLayers.length; i++) {
        out.push(container.artLayers[i]);
    }
    for (i = 0; i < container.layerSets.length; i++) {
        collectLayers(container.layerSets[i], out);
    }
    return out;
}

/** 图层在图层面板里的完整路径，便于在报告里定位 */
function layerPath(layer) {
    var parts = [];
    var p = layer;
    try {
        while (p && p.parent && p.parent.typename === "LayerSet") {
            p = p.parent;
            parts.unshift(p.name);
        }
    } catch (e) {}
    return parts.length ? parts.join(" / ") : "(根)";
}

// ══════════════════════════════════════════════════════════════
//  核心操作
// ══════════════════════════════════════════════════════════════

/**
 * 重建图层边界：在目标层下方插入一个空层再向下合并。
 * 空层 bounds 为 0，合并后的 union bounds 就是目标层的真实内容边界。
 * 仅对 100% 不透明 + 正常混合 + 无样式/蒙版/剪贴 的层执行，此时合并像素结果与原样完全一致。
 */
function rebuildBounds(doc, layer) {
    var nm = layer.name;
    var vis = layer.visible;

    doc.activeLayer = layer;
    var empty = doc.artLayers.add();
    empty.name = "__psdslim_tmp__";
    empty.move(layer, ElementPlacement.PLACEAFTER);

    doc.activeLayer = layer;
    var merged = layer.merge();
    merged.name = nm;
    merged.visible = vis;
    return merged;
}

/** 栅格化形状图层 */
function rasterizeShape(doc, layer) {
    doc.activeLayer = layer;
    try {
        layer.rasterize(RasterizeType.SHAPE);
        return true;
    } catch (e1) {
        // DOM 走不通就用 ActionManager
        try {
            var d = new ActionDescriptor();
            var r = new ActionReference();
            r.putEnumerated(s2t("layer"), s2t("ordinal"), s2t("targetEnum"));
            d.putReference(s2t("null"), r);
            d.putEnumerated(s2t("what"), s2t("rasterizeItem"), s2t("shape"));
            executeAction(s2t("rasterizeLayer"), d, DialogModes.NO);
            return true;
        } catch (e2) {
            return false;
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  主流程
// ══════════════════════════════════════════════════════════════
function main() {
    if (app.documents.length === 0) {
        alert("请先在 Photoshop 里打开要瘦身的 PSD，再运行本脚本。");
        return;
    }

    var doc = app.activeDocument;
    var origPath, origName;
    try {
        origPath = doc.path;
        origName = doc.name;
    } catch (e) {
        alert("这个文档还没存过盘。请先保存一次再运行本脚本。");
        return;
    }

    var canvasArea = doc.width.as("px") * doc.height.as("px");
    var startRuler = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    var startDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;

    log("PsdSlim 报告");
    log("源文件   : " + origName);
    log("画布     : " + Math.round(doc.width.as("px")) + " x " + Math.round(doc.height.as("px")) + " px");
    log("");

    // ── 第 1 遍：扫描分类 ──────────────────────────────────
    var all = collectLayers(doc, []);
    var ghosts = [], ghostsUnsafe = [], shapes = [], empties = [];
    var i, L, d, area, kind;

    for (i = 0; i < all.length; i++) {
        L = all[i];
        var b;
        try { b = L.bounds; } catch (e) { continue; }
        area = boundsArea(b);

        // 空层
        if (area === 0) {
            empties.push(L);
            continue;
        }

        try { kind = L.kind; } catch (e) { kind = null; }

        // —— 幽灵层候选：标称面积逼近整张画布 ——
        if (area >= canvasArea * CFG.ghostAreaRatio && kind === LayerKind.NORMAL) {
            doc.activeLayer = L;
            d = activeLayerDesc();
            var isSafe = (!descHasEffects(d))
                      && (!descBool(d, "hasUserMask"))
                      && (!descBool(d, "hasVectorMask"))
                      && (!L.grouped)
                      && (Math.round(L.opacity) === 100)
                      && (L.blendMode === BlendMode.NORMAL)
                      && (L.visible);
            var rec = { layer: L, w: boundsW(b), h: boundsH(b), path: layerPath(L), name: L.name };
            if (isSafe) { ghosts.push(rec); }
            else {
                rec.why = (descHasEffects(d) ? "有样式 " : "")
                        + (descBool(d, "hasUserMask") ? "有蒙版 " : "")
                        + (descBool(d, "hasVectorMask") ? "有矢量蒙版 " : "")
                        + (L.grouped ? "剪贴蒙版 " : "")
                        + (Math.round(L.opacity) !== 100 ? "不透明" + Math.round(L.opacity) + "% " : "")
                        + (L.blendMode !== BlendMode.NORMAL ? "非正常混合 " : "")
                        + (!L.visible ? "隐藏 " : "");
                ghostsUnsafe.push(rec);
            }
            continue;
        }

        // —— 重路径形状层：填充层 + 矢量蒙版 + 尺寸够大 ——
        var isFill = (kind === LayerKind.SOLIDFILL
                   || kind === LayerKind.GRADIENTFILL
                   || kind === LayerKind.PATTERNFILL);
        if (isFill && area >= CFG.shapeAreaThreshold) {
            doc.activeLayer = L;
            d = activeLayerDesc();
            if (descBool(d, "hasVectorMask")) {
                shapes.push({ layer: L, w: boundsW(b), h: boundsH(b), path: layerPath(L), name: L.name });
            }
        }
    }

    // ── 报告 alpha 通道 ────────────────────────────────────
    var alphaNames = [];
    for (i = 0; i < doc.channels.length; i++) {
        try {
            if (doc.channels[i].kind === ChannelType.MASKEDAREA
             || doc.channels[i].kind === ChannelType.SELECTEDAREA) {
                alphaNames.push(doc.channels[i].name);
            }
        } catch (e) {}
    }

    // ── 汇总给用户确认 ────────────────────────────────────
    var sum = [];
    sum.push("扫描完成 —— 本文件共 " + all.length + " 个图层\n");
    sum.push("① 幽灵层（边界被撑满画布、可无损重建）: " + ghosts.length + " 个");
    for (i = 0; i < ghosts.length && i < 12; i++) {
        sum.push("     " + pad(ghosts[i].name, 14) + ghosts[i].w + "x" + ghosts[i].h + "   " + ghosts[i].path);
    }
    if (ghosts.length > 12) { sum.push("     …还有 " + (ghosts.length - 12) + " 个"); }

    if (ghostsUnsafe.length) {
        sum.push("\n   （另有 " + ghostsUnsafe.length + " 个全画布层带样式/蒙版等，为保证无损已跳过）");
    }

    sum.push("\n② 重路径形状层（将栅格化）: " + shapes.length + " 个");
    for (i = 0; i < shapes.length && i < 12; i++) {
        sum.push("     " + pad(shapes[i].name, 14) + shapes[i].w + "x" + shapes[i].h + "   " + shapes[i].path);
    }
    if (shapes.length > 12) { sum.push("     …还有 " + (shapes.length - 12) + " 个"); }

    sum.push("\n③ 空图层（将删除）: " + empties.length + " 个");
    sum.push("④ Alpha 通道: " + (alphaNames.length ? alphaNames.join("、") : "无")
             + (alphaNames.length && !CFG.deleteAlphaChannels ? "  （保留，如需删除请改配置）" : ""));
    sum.push("\n原文件不会被修改，结果另存为  " + origName.replace(/\.psd$/i, "") + CFG.suffix + ".psd");

    var summary = sum.join("\n");
    log(summary);
    log("");

    if (CFG.reportOnly) {
        if (!CFG.silent) {
            alert("【仅诊断模式】\n\n" + summary + "\n\n把脚本里 CFG.reportOnly 改成 false 才会真正执行。");
        }
        app.preferences.rulerUnits = startRuler;
        app.displayDialogs = startDialogs;
        return;
    }

    if (!CFG.silent && !confirm(summary + "\n\n开始处理？（大文件可能要几分钟，期间 PS 会无响应）")) {
        app.preferences.rulerUnits = startRuler;
        app.displayDialogs = startDialogs;
        return;
    }

    // ── 关键一步：先另存副本，之后只动副本，原文件从此安全 ──
    var outFile = new File(origPath + "/" + origName.replace(/\.psd$/i, "") + CFG.suffix + ".psd");
    var opts = new PhotoshopSaveOptions();
    opts.layers = true;
    opts.embedColorProfile = true;
    opts.alphaChannels = !CFG.deleteAlphaChannels;
    opts.maximizeCompatibility = !CFG.disableMaxCompat;
    doc.saveAs(outFile, opts, false, Extension.LOWERCASE);
    doc = app.activeDocument;   // 现在指向副本
    log("已另存副本: " + outFile.fsName);

    var nGhost = 0, nShape = 0, nEmpty = 0, failed = [];

    // ── ① 重建幽灵层边界 ──────────────────────────────────
    if (CFG.fixGhostBounds) {
        for (i = 0; i < ghosts.length; i++) {
            try {
                var before = ghosts[i].w + "x" + ghosts[i].h;
                var m = rebuildBounds(doc, ghosts[i].layer);
                var nb = m.bounds;
                log("  幽灵层 " + pad(ghosts[i].name, 14) + before + "  →  " + boundsW(nb) + "x" + boundsH(nb));
                nGhost++;
            } catch (e) {
                failed.push("幽灵层 " + ghosts[i].name + " : " + e.message);
            }
        }
    }

    // ── ② 栅格化重路径形状层 ──────────────────────────────
    if (CFG.rasterizeHeavyShapes) {
        for (i = 0; i < shapes.length; i++) {
            try {
                if (rasterizeShape(doc, shapes[i].layer)) {
                    log("  栅格化 " + pad(shapes[i].name, 14) + shapes[i].w + "x" + shapes[i].h);
                    nShape++;
                } else {
                    failed.push("栅格化失败 " + shapes[i].name);
                }
            } catch (e) {
                failed.push("栅格化 " + shapes[i].name + " : " + e.message);
            }
        }
    }

    // ── ③ 删空层 ──────────────────────────────────────────
    if (CFG.deleteEmptyLayers) {
        for (i = 0; i < empties.length; i++) {
            try { empties[i].remove(); nEmpty++; } catch (e) {}
        }
    }

    // ── ④ 删 alpha 通道 ───────────────────────────────────
    var nAlpha = 0;
    if (CFG.deleteAlphaChannels) {
        for (i = doc.channels.length - 1; i >= 0; i--) {
            try {
                if (doc.channels[i].kind === ChannelType.MASKEDAREA
                 || doc.channels[i].kind === ChannelType.SELECTEDAREA) {
                    doc.channels[i].remove(); nAlpha++;
                }
            } catch (e) {}
        }
    }

    // ── 存盘（关兼容） ────────────────────────────────────
    app.purge(PurgeTarget.ALLCACHES);
    var opts2 = new PhotoshopSaveOptions();
    opts2.layers = true;
    opts2.embedColorProfile = true;
    opts2.alphaChannels = !CFG.deleteAlphaChannels;
    opts2.maximizeCompatibility = !CFG.disableMaxCompat;
    doc.saveAs(outFile, opts2, false, Extension.LOWERCASE);

    // ── 结果 ──────────────────────────────────────────────
    var newSize = 0;
    try { newSize = outFile.length; } catch (e) {}

    var res = [];
    res.push("完成。\n");
    res.push("重建边界的幽灵层 : " + nGhost + " 个");
    res.push("栅格化的形状层   : " + nShape + " 个");
    res.push("删除的空图层     : " + nEmpty + " 个");
    if (CFG.deleteAlphaChannels) { res.push("删除的 Alpha 通道: " + nAlpha + " 个"); }
    if (CFG.disableMaxCompat)    { res.push("已关闭「最大化兼容」"); }
    if (newSize)                 { res.push("\n输出文件大小 : " + fmtMB(newSize)); }
    res.push("输出位置 : " + outFile.fsName);
    res.push("\n原文件未被改动。");
    if (failed.length) {
        res.push("\n⚠ 有 " + failed.length + " 项没处理成功：");
        for (i = 0; i < failed.length && i < 8; i++) { res.push("   " + failed[i]); }
    }

    var result = res.join("\n");
    log("");
    log(result);

    if (CFG.writeLog) {
        try {
            var lf = new File(origPath + "/" + origName.replace(/\.psd$/i, "") + CFG.suffix + "_日志.txt");
            lf.encoding = "UTF-8";
            lf.open("w");
            lf.write(LOG.join("\r\n"));
            lf.close();
        } catch (e) {}
    }

    app.preferences.rulerUnits = startRuler;
    app.displayDialogs = startDialogs;
    if (!CFG.silent) { alert(result); }
}

try {
    main();
} catch (err) {
    if (CFG.silent) {
        try {
            var ef = new File(Folder.temp + "/psdslim_error.txt");
            ef.encoding = "UTF-8";
            ef.open("w");
            ef.write("PsdSlim 出错: " + err.message + " (行 " + err.line + ")");
            ef.close();
        } catch (e2) {}
    } else {
        alert("PsdSlim 出错了：\n" + err.message + "\n(行 " + err.line + ")\n\n原文件未受影响。");
    }
}
