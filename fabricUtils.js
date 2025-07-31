/**
 * FabricsUtils - 基于Fabric.js的图片合成工具
 * 增强版本：支持完整的视觉效果参数（混合模式、滤镜、阴影等）
 * 内存优化版本：添加图片尺寸限制和自动压缩功能
 * @version 4.1.0
 * @dependencies fabric.js
 */

class FabricsUtils {
    constructor(canvasId) {
        // 获取canvas元素
        this.canvasElement = document.getElementById(canvasId);
        if (!this.canvasElement) {
            throw new Error(`找不到ID为 "${canvasId}" 的画布元素`);
        }

        // 检查fabric.js是否加载
        if (typeof fabric === 'undefined') {
            throw new Error('Fabric.js library is not loaded. Please include fabric.js before using FabricsUtils.');
        }

        // 创建fabric canvas实例
        this.canvas = new fabric.Canvas(this.canvasElement, {
            width: this.canvasElement.width || 800,
            height: this.canvasElement.height || 600,
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true
        });

        // 图片对象引用
        this.backgroundImage = null;
        this.foregroundImage = null;

        // 初始化
        this.init();
    }

    /**
     * 图片尺寸限制配置（内存优化）
     */
    static IMAGE_SIZE_LIMITS = {
        // 单个图片的最大尺寸限制
        MAX_WIDTH: 1920,
        MAX_HEIGHT: 1080,
        // 总像素数限制（16MP）
        MAX_PIXELS: 16 * 1024 * 1024,
        // 压缩质量
        COMPRESSION_QUALITY: 0.9
    };

    /**
     * 初始化画布
     */
    init() {
        // 禁用右键菜单
        this.canvas.on('mouse:down', (options) => {
            if (options.e.button === 2) { // 右键
                options.e.preventDefault();
                return false;
            }
        });

        // 设置对象选中样式
        fabric.Object.prototype.set({
            borderColor: '#4facfe',
            cornerColor: '#4facfe',
            cornerStyle: 'circle',
            cornerSize: 8,
            transparentCorners: false,
            borderOpacityWhenMoving: 0.5,
            borderScaleFactor: 2
        });
    }

    /**
     * 检查图片是否需要压缩
     * @param {number} width - 图片宽度
     * @param {number} height - 图片高度
     * @returns {Object} 压缩信息 {needsCompression, newWidth, newHeight, compressionRatio}
     */
    checkImageCompression(width, height) {
        const limits = FabricsUtils.IMAGE_SIZE_LIMITS;
        const totalPixels = width * height;

        let needsCompression = false;
        let compressionRatio = 1;

        // 检查单边尺寸限制
        if (width > limits.MAX_WIDTH || height > limits.MAX_HEIGHT) {
            const scaleByWidth = limits.MAX_WIDTH / width;
            const scaleByHeight = limits.MAX_HEIGHT / height;
            compressionRatio = Math.min(scaleByWidth, scaleByHeight);
            needsCompression = true;
        }

        // 检查总像素数限制
        if (totalPixels > limits.MAX_PIXELS) {
            const pixelRatio = Math.sqrt(limits.MAX_PIXELS / totalPixels);
            compressionRatio = Math.min(compressionRatio, pixelRatio);
            needsCompression = true;
        }

        const newWidth = Math.round(width * compressionRatio);
        const newHeight = Math.round(height * compressionRatio);

        return {
            needsCompression,
            newWidth,
            newHeight,
            compressionRatio,
            originalSize: `${width}×${height}`,
            compressedSize: `${newWidth}×${newHeight}`,
            originalPixels: totalPixels,
            compressedPixels: newWidth * newHeight
        };
    }

    /**
     * 压缩图片
     * @param {HTMLImageElement} imgElement - 原始图片元素
     * @param {number} newWidth - 目标宽度
     * @param {number} newHeight - 目标高度
     * @returns {Promise<HTMLImageElement>} 压缩后的图片元素
     */
    async compressImage(imgElement, newWidth, newHeight) {
        return new Promise((resolve, reject) => {
            try {
                // 创建临时canvas
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');

                tempCanvas.width = newWidth;
                tempCanvas.height = newHeight;

                // 设置高质量缩放
                tempCtx.imageSmoothingEnabled = true;
                tempCtx.imageSmoothingQuality = 'high';

                // 绘制压缩后的图片
                tempCtx.drawImage(imgElement, 0, 0, newWidth, newHeight);

                // 转换为data URL并创建新的图片元素
                const dataURL = tempCanvas.toDataURL('image/jpeg', FabricsUtils.IMAGE_SIZE_LIMITS.COMPRESSION_QUALITY);

                const compressedImg = new Image();
                compressedImg.crossOrigin = 'anonymous';

                compressedImg.onload = () => {
                    console.log('图片压缩完成:', {
                        原始尺寸: `${imgElement.width}×${imgElement.height}`,
                        压缩尺寸: `${compressedImg.width}×${compressedImg.height}`,
                        压缩比例: (newWidth / imgElement.width).toFixed(3)
                    });
                    resolve(compressedImg);
                };

                compressedImg.onerror = () => {
                    reject(new Error('图片压缩失败'));
                };

                compressedImg.src = dataURL;

                // 清理临时canvas
                tempCanvas.remove();

            } catch (error) {
                console.error('图片压缩异常:', error);
                reject(error);
            }
        });
    }

    /**
     * 创建滤镜数组
     * @param {Object} params - 效果参数
     * @returns {Array} 滤镜数组
     */
    createFilters(params) {
        const filters = [];

        // 亮度调整
        if (params.brightness !== undefined) {
            filters.push(new fabric.Image.filters.Brightness({
                brightness: params.brightness
            }));
        }

        // 对比度调整
        if (params.contrast !== undefined) {
            filters.push(new fabric.Image.filters.Contrast({
                contrast: params.contrast
            }));
        }

        // 饱和度调整
        if (params.saturation !== undefined) {
            filters.push(new fabric.Image.filters.Saturation({
                saturation: params.saturation
            }));
        }

        // 色相调整
        if (params.hue !== undefined) {
            filters.push(new fabric.Image.filters.HueRotation({
                rotation: params.hue
            }));
        }

        // 模糊效果
        if (params.blur !== undefined && params.blur > 0) {
            filters.push(new fabric.Image.filters.Blur({
                blur: params.blur
            }));
        }

        // 锐化效果
        if (params.sharpen !== undefined && params.sharpen > 0) {
            filters.push(new fabric.Image.filters.Convolute({
                matrix: [
                    0, -params.sharpen * 0.5, 0,
                    -params.sharpen * 0.5, 1 + params.sharpen * 2, -params.sharpen * 0.5,
                    0, -params.sharpen * 0.5, 0
                ]
            }));
        }

        // 颜色矩阵（高级颜色调整）
        if (params.colorMatrix) {
            filters.push(new fabric.Image.filters.ColorMatrix({
                matrix: params.colorMatrix
            }));
        }

        // 噪点效果
        if (params.noise !== undefined && params.noise > 0) {
            filters.push(new fabric.Image.filters.Noise({
                noise: params.noise
            }));
        }

        // 像素化效果
        if (params.pixelate !== undefined && params.pixelate > 1) {
            filters.push(new fabric.Image.filters.Pixelate({
                blocksize: params.pixelate
            }));
        }

        console.log('创建滤镜:', filters.length, '个滤镜');
        return filters;
    }

    /**
     * 创建阴影效果
     * @param {Object} params - 效果参数
     * @returns {fabric.Shadow|null} 阴影对象
     */
    createShadow(params) {
        if (!params.shadowOffsetX && !params.shadowOffsetY && !params.shadowBlur) {
            return null;
        }

        const shadow = new fabric.Shadow({
            color: params.shadowColor || 'rgba(0,0,0,0.3)',
            blur: params.shadowBlur || 5,
            offsetX: params.shadowOffsetX || 0,
            offsetY: params.shadowOffsetY || 0
        });

        console.log('创建阴影:', shadow);
        return shadow;
    }

    /**
     * 应用前景图效果
     * @param {fabric.Image} img - 图片对象
     * @param {Object} params - 效果参数
     */
    applyForegroundEffects(img, params) {
        // 设置混合模式
        if (params.blendMode) {
            img.set({ globalCompositeOperation: params.blendMode });
        }

        // 设置透明度
        if (params.opacity !== undefined) {
            img.set({ opacity: params.opacity });
        }

        // 设置图像质量
        img.set({
            imageSmoothing: params.imageSmoothing !== false,
            imageSmoothingQuality: params.imageSmoothingQuality || 'high'
        });

        // 应用滤镜
        const filters = this.createFilters(params);
        if (filters.length > 0) {
            img.filters = filters;
            img.applyFilters();
        }

        // 应用阴影
        const shadow = this.createShadow(params);
        if (shadow) {
            img.set({ shadow: shadow });
        }

        console.log('前景图效果已应用:', {
            blendMode: params.blendMode,
            opacity: params.opacity,
            filtersCount: filters.length,
            hasShadow: !!shadow
        });
    }

    /**
     * 加载图片（增强版：支持自动尺寸限制和压缩）
     * @param {string} url - 图片URL
     * @returns {Promise<fabric.Image>}
     */
    loadFabricImage(url) {
        return new Promise((resolve, reject) => {
            console.log('开始加载图片:', url);

            // 首先加载原始图片以检查尺寸
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';

            tempImg.onload = async () => {
                try {
                    console.log('图片加载完成，原始尺寸:', {
                        width: tempImg.width,
                        height: tempImg.height,
                        pixels: tempImg.width * tempImg.height
                    });

                    // 检查是否需要压缩
                    const compressionInfo = this.checkImageCompression(tempImg.width, tempImg.height);
                    console.log('尺寸检查结果:', compressionInfo);

                    let finalImg = tempImg;

                    // 如果需要压缩，则进行压缩
                    if (compressionInfo.needsCompression) {
                        console.log('图片尺寸超出限制，开始压缩...');
                        finalImg = await this.compressImage(tempImg, compressionInfo.newWidth, compressionInfo.newHeight);
                    }

                    // 使用最终的图片创建fabric.Image对象
                    fabric.Image.fromURL(finalImg.src, (img) => {
                        if (img.getElement()) {
                            console.log('Fabric图片对象创建成功:', {
                                最终尺寸: `${img.width}×${img.height}`,
                                是否压缩: compressionInfo.needsCompression,
                                压缩比例: compressionInfo.compressionRatio.toFixed(3)
                            });
                            resolve(img);
                        } else {
                            reject(new Error(`Fabric图片对象创建失败: ${url}`));
                        }
                    }, {
                        crossOrigin: 'anonymous'
                    });

                } catch (error) {
                    console.error('图片处理失败:', error);
                    reject(new Error(`图片处理失败: ${error.message}`));
                }
            };

            tempImg.onerror = () => {
                console.error('图片加载失败:', url);
                reject(new Error(`图片加载失败: ${url}`));
            };

            tempImg.src = url;
        });
    }

    /**
     * 渲染合成画布
     * @param {string} foregroundUrl - 前景图片URL
     * @param {string} backgroundUrl - 背景图片URL
     * @param {Object} params - 前景图参数
     * @returns {Promise<void>}
     */
    async renderComposition(foregroundUrl, backgroundUrl, params = {}) {
        try {
            console.log('开始渲染合成画布:', { foregroundUrl, backgroundUrl, params });

            // 清空画布
            this.canvas.clear();

            // 设置画布大小（如果指定）
            if (params.canvasWidth) {
                this.canvas.setWidth(params.canvasWidth);
            }
            if (params.canvasHeight) {
                this.canvas.setHeight(params.canvasHeight);
            }

            // 先加载背景图
            if (backgroundUrl) {
                await this.loadAndSetBackground(backgroundUrl, params);
                console.log('背景图加载完成');
            }

            // 后加载前景图，确保在背景图之上
            if (foregroundUrl) {
                await this.loadAndSetForeground(foregroundUrl, params);
                console.log('前景图加载完成');
            }

            // 渲染画布
            this.canvas.renderAll();
            console.log('画布渲染完成');

        } catch (error) {
            console.error('渲染失败:', error);
            throw error;
        }
    }

    /**
     * 加载并设置背景图
     * @param {string} backgroundUrl - 背景图URL
     * @param {Object} params - 参数
     */
    async loadAndSetBackground(backgroundUrl, params = {}) {
        const backgroundImg = await this.loadFabricImage(backgroundUrl);

        // 计算保持长宽比的缩放比例
        const scaleX = this.canvas.width / backgroundImg.width;
        const scaleY = this.canvas.height / backgroundImg.height;

        // 使用较小的缩放比例，确保图片完全显示在画布内
        const scale = Math.min(scaleX, scaleY);

        // 计算缩放后的实际尺寸
        const scaledWidth = backgroundImg.width * scale;
        const scaledHeight = backgroundImg.height * scale;

        // 计算居中位置
        const left = (this.canvas.width - scaledWidth) / 2;
        const top = (this.canvas.height - scaledHeight) / 2;

        // 设置背景图属性
        backgroundImg.set({
            left: left,
            top: top,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            excludeFromExport: false,
            originX: 'left',
            originY: 'top'
        });

        // 背景图轻微调整（可选）
        if (params.backgroundAdjust) {
            const bgFilters = [];

            if (params.backgroundBrightness !== undefined) {
                bgFilters.push(new fabric.Image.filters.Brightness({
                    brightness: params.backgroundBrightness
                }));
            }

            if (params.backgroundSaturation !== undefined) {
                bgFilters.push(new fabric.Image.filters.Saturation({
                    saturation: params.backgroundSaturation
                }));
            }

            if (bgFilters.length > 0) {
                backgroundImg.filters = bgFilters;
                backgroundImg.applyFilters();
                console.log('背景图调整已应用:', bgFilters.length, '个滤镜');
            }
        }

        // 设置为背景
        this.canvas.setBackgroundImage(backgroundImg, this.canvas.renderAll.bind(this.canvas));
        this.backgroundImage = backgroundImg;

        console.log('背景图已设置:', {
            originalSize: `${backgroundImg.width}x${backgroundImg.height}`,
            scaledSize: `${scaledWidth}x${scaledHeight}`,
            scale: scale.toFixed(3),
            position: `(${left}, ${top})`,
            canvasSize: `${this.canvas.width}x${this.canvas.height}`
        });
    }

    /**
     * 加载并设置前景图（增强版：支持完整效果参数）
     * @param {string} foregroundUrl - 前景图URL
     * @param {Object} params - 参数
     */
    async loadAndSetForeground(foregroundUrl, params = {}) {
        const foregroundImg = await this.loadFabricImage(foregroundUrl);

        // 计算前景图在画布中的目标尺寸（画布的70%）
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const targetMaxWidth = canvasWidth * 0.7;
        const targetMaxHeight = canvasHeight * 0.7;

        // 获取前景图原始尺寸
        const imgWidth = foregroundImg.width;
        const imgHeight = foregroundImg.height;

        // 计算保持宽高比的缩放比例
        let scaleX, scaleY;

        // 如果用户明确指定了宽高，则使用指定的尺寸
        if (params.width || params.height) {
            const targetWidth = params.width || imgWidth;
            const targetHeight = params.height || imgHeight;
            scaleX = targetWidth / imgWidth;
            scaleY = targetHeight / imgHeight;
        } else {
            // 默认情况：保持宽高比，适应画布70%大小
            const scaleRatio = Math.min(targetMaxWidth / imgWidth, targetMaxHeight / imgHeight);
            scaleX = scaleRatio;
            scaleY = scaleRatio;
        }

        // 计算实际显示尺寸
        const displayWidth = imgWidth * scaleX;
        const displayHeight = imgHeight * scaleY;

        // 计算居中位置
        const posX = params.x !== undefined ? params.x : (canvasWidth - displayWidth) / 2;
        const posY = params.y !== undefined ? params.y : (canvasHeight - displayHeight) / 2;

        // 设置前景图基础属性
        foregroundImg.set({
            left: posX,
            top: posY,
            scaleX: scaleX,
            scaleY: scaleY,
            angle: params.rotation || 0,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            lockUniScaling: false,
            cornerStyle: 'circle',
            cornerSize: 10,
            borderColor: '#4facfe',
            cornerColor: '#4facfe'
        });

        // 🎯 应用完整的视觉效果（核心增强功能）
        this.applyForegroundEffects(foregroundImg, params);

        // 添加到画布
        this.canvas.add(foregroundImg);

        // 确保前景图在最前面
        this.canvas.bringToFront(foregroundImg);

        // 设置为活动对象
        this.canvas.setActiveObject(foregroundImg);
        this.foregroundImage = foregroundImg;

        console.log('前景图已添加:', {
            left: foregroundImg.left,
            top: foregroundImg.top,
            width: displayWidth,
            height: displayHeight,
            originalSize: `${imgWidth}x${imgHeight}`,
            scale: `${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`,
            canvasSize: `${canvasWidth}x${canvasHeight}`,
            targetMaxSize: `${targetMaxWidth}x${targetMaxHeight}`,
            effectsApplied: !!(params.blendMode || params.opacity || params.brightness || params.contrast)
        });
    }

    /**
     * 改变背景图，保留前景图位置和大小
     * @param {string} backgroundUrl - 新的背景图URL
     * @returns {Promise<void>}
     */
    async changeBackground(backgroundUrl) {
        try {
            if (!this.canvas) {
                throw new Error('请先调用 renderComposition 方法初始化画布');
            }

            console.log('开始更换背景图:', backgroundUrl);

            // 保存当前前景图状态
            let foregroundState = null;
            if (this.foregroundImage && this.canvas.contains(this.foregroundImage)) {
                foregroundState = {
                    left: this.foregroundImage.left,
                    top: this.foregroundImage.top,
                    scaleX: this.foregroundImage.scaleX,
                    scaleY: this.foregroundImage.scaleY,
                    angle: this.foregroundImage.angle,
                    opacity: this.foregroundImage.opacity,
                    globalCompositeOperation: this.foregroundImage.globalCompositeOperation,
                    filters: this.foregroundImage.filters ? [...this.foregroundImage.filters] : [],
                    shadow: this.foregroundImage.shadow
                };
                console.log('保存前景图状态:', foregroundState);
            }

            // 加载新背景图
            await this.loadAndSetBackground(backgroundUrl);
            console.log('新背景图加载完成');

            // 恢复前景图状态
            if (foregroundState && this.foregroundImage && this.canvas.contains(this.foregroundImage)) {
                this.foregroundImage.set(foregroundState);

                // 重新应用滤镜
                if (foregroundState.filters && foregroundState.filters.length > 0) {
                    this.foregroundImage.filters = foregroundState.filters;
                    this.foregroundImage.applyFilters();
                }

                this.canvas.bringToFront(this.foregroundImage);
                this.canvas.setActiveObject(this.foregroundImage);
                console.log('前景图状态已恢复');
            }

            // 重新渲染
            this.canvas.renderAll();

        } catch (error) {
            console.error('背景图片更换失败:', error);
            throw error;
        }
    }

    /**
     * 下载合成后的图片（基于背景图区域导出高清图片）
     * @param {string} filename - 文件名
     * @param {string} format - 图片格式 ('png', 'jpeg', 'webp')
     * @param {number} quality - 图片质量 (0-1)
     * @param {Object} options - 导出选项
     * @param {number} options.maxWidth - 最大宽度（保持长宽比）
     * @param {number} options.maxHeight - 最大高度（保持长宽比）
     * @returns {Promise<void>}
     */
    async downloadImage(filename = 'composition', format = 'png', quality = 0.9, options = {}) {
        try {
            if (!this.canvas) {
                throw new Error('画布未初始化，请先调用 renderComposition 方法');
            }

            if (!this.backgroundImage) {
                throw new Error('背景图未设置，无法导出');
            }

            // 解构选项参数
            const { maxWidth, maxHeight } = options;

            // 取消所有对象的选中状态，避免控制框出现在导出图片中
            this.canvas.discardActiveObject();
            this.canvas.renderAll();

            // 获取背景图的信息
            const bgOriginalWidth = this.backgroundImage.width;
            const bgOriginalHeight = this.backgroundImage.height;
            const bgScale = this.backgroundImage.scaleX;
            const bgLeft = this.backgroundImage.left;
            const bgTop = this.backgroundImage.top;

            console.log('背景图信息:', {
                原始尺寸: `${bgOriginalWidth}×${bgOriginalHeight}`,
                缩放比例: bgScale.toFixed(3),
                位置: `(${bgLeft}, ${bgTop})`
            });

            // 计算导出尺寸
            let exportScale = 1;
            if (maxWidth || maxHeight) {
                const scaleByWidth = maxWidth ? maxWidth / bgOriginalWidth : Infinity;
                const scaleByHeight = maxHeight ? maxHeight / bgOriginalHeight : Infinity;
                exportScale = Math.min(scaleByWidth, scaleByHeight);
            }

            const exportWidth = Math.round(bgOriginalWidth * exportScale);
            const exportHeight = Math.round(bgOriginalHeight * exportScale);

            console.log('导出尺寸:', {
                最大限制: `${maxWidth || '不限'}×${maxHeight || '不限'}`,
                导出比例: exportScale.toFixed(3),
                最终尺寸: `${exportWidth}×${exportHeight}`
            });

            // 创建临时的fabric canvas用于高清导出
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = exportWidth;
            tempCanvas.height = exportHeight;

            const tempFabricCanvas = new fabric.Canvas(tempCanvas, {
                width: exportWidth,
                height: exportHeight,
                backgroundColor: 'transparent'
            });

            // 计算缩放因子：从画布显示尺寸到导出尺寸
            const scaleFactor = exportScale;

            // 添加背景图（使用原始图片，按导出尺寸缩放）
            await new Promise((resolve, reject) => {
                fabric.Image.fromURL(this.backgroundImage.getSrc(), (img) => {
                    if (img.getElement()) {
                        img.set({
                            left: 0,
                            top: 0,
                            scaleX: scaleFactor,
                            scaleY: scaleFactor,
                            originX: 'left',
                            originY: 'top'
                        });

                        // 保持背景图的滤镜效果
                        if (this.backgroundImage.filters && this.backgroundImage.filters.length > 0) {
                            img.filters = [...this.backgroundImage.filters];
                            img.applyFilters();
                        }

                        tempFabricCanvas.setBackgroundImage(img, () => {
                            tempFabricCanvas.renderAll();
                            resolve();
                        });
                    } else {
                        reject(new Error('背景图加载失败'));
                    }
                }, {
                    crossOrigin: 'anonymous'
                });
            });

            // 添加前景图（如果存在）
            if (this.foregroundImage) {
                await new Promise((resolve, reject) => {
                    fabric.Image.fromURL(this.foregroundImage.getSrc(), (img) => {
                        if (img.getElement()) {
                            // 计算前景图在导出画布中的位置
                            // 需要考虑背景图的偏移和缩放
                            const relativeLeft = (this.foregroundImage.left - bgLeft) / bgScale;
                            const relativeTop = (this.foregroundImage.top - bgTop) / bgScale;
                            const relativeScaleX = this.foregroundImage.scaleX / bgScale;
                            const relativeScaleY = this.foregroundImage.scaleY / bgScale;

                            img.set({
                                left: relativeLeft * exportScale,
                                top: relativeTop * exportScale,
                                scaleX: relativeScaleX * exportScale,
                                scaleY: relativeScaleY * exportScale,
                                angle: this.foregroundImage.angle,
                                opacity: this.foregroundImage.opacity,
                                globalCompositeOperation: this.foregroundImage.globalCompositeOperation,
                                originX: this.foregroundImage.originX,
                                originY: this.foregroundImage.originY
                            });

                            // 保持前景图的所有效果
                            if (this.foregroundImage.filters && this.foregroundImage.filters.length > 0) {
                                img.filters = [...this.foregroundImage.filters];
                                img.applyFilters();
                            }

                            if (this.foregroundImage.shadow) {
                                const scaledShadow = new fabric.Shadow({
                                    color: this.foregroundImage.shadow.color,
                                    blur: this.foregroundImage.shadow.blur * exportScale,
                                    offsetX: this.foregroundImage.shadow.offsetX * exportScale,
                                    offsetY: this.foregroundImage.shadow.offsetY * exportScale
                                });
                                img.set({ shadow: scaledShadow });
                            }

                            tempFabricCanvas.add(img);
                            tempFabricCanvas.renderAll();
                            resolve();
                        } else {
                            reject(new Error('前景图加载失败'));
                        }
                    }, {
                        crossOrigin: 'anonymous'
                    });
                });
            }

            // 渲染最终画布
            tempFabricCanvas.renderAll();

            // 生成数据URL
            let dataURL;
            if (format === 'jpeg' || format === 'jpg') {
                // JPEG需要白色背景
                tempFabricCanvas.backgroundColor = '#FFFFFF';
                tempFabricCanvas.renderAll();
                dataURL = tempFabricCanvas.toDataURL({
                    format: 'jpeg',
                    quality: quality
                });
            } else if (format === 'webp') {
                dataURL = tempFabricCanvas.toDataURL({
                    format: 'webp',
                    quality: quality
                });
            } else {
                dataURL = tempFabricCanvas.toDataURL({
                    format: 'png'
                });
            }

            // 清理临时画布
            tempFabricCanvas.dispose();

            // 创建下载链接
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `${filename}.${format}`;

            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('高清图片下载完成:', {
                格式: format,
                尺寸: `${exportWidth}×${exportHeight}`,
                效果保持: '所有视觉效果已保持'
            });

        } catch (error) {
            console.error('下载失败:', error);
            throw error;
        }
    }

    /**
     * 清空画布
     */
    clear() {
        if (this.canvas) {
            this.canvas.clear();
        }
        this.backgroundImage = null;
        this.foregroundImage = null;
    }

    /**
     * 销毁实例，清理资源
     */
    destroy() {
        if (this.canvas) {
            this.canvas.dispose();
        }
        this.canvas = null;
        this.canvasElement = null;
        this.backgroundImage = null;
        this.foregroundImage = null;
    }
}

// 确保在全局作用域中可用
window.FabricsUtils = FabricsUtils;