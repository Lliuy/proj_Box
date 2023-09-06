/*******************************************************************************
文件: XMath.ts
创建: 2019年9月19日
作者: 杭州炫火科技有限公司 老张(zwx@xfire.mobi)
描述:
    数学模块，一些常用数学接口。

2020年5月14日
    新增splitCubicBezier

2019年9月19日
    新增cross、segmentsIntersect、isPointInTriangle
*******************************************************************************/


export default class XMath {
    /**
     * 计算向量p0p1与p0p2的内积
     */
    public static dot(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
        return (x1 - x0) * (x2 - x0) + (y1 - y0) * (y2 - y0);
    }

    /**
     * 计算向量p0p1与p0p2的叉积
     * 用途：
     * 1.判断点在线的哪一侧，右手坐标系下叉积>0表p2在p0->p1的左侧，<0表右侧
     * 2.判断三角形点序
     */
    public static cross(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number {
        return (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    }

    /** 约束num到limit1与limit2之间，limit1、limit2的大小不影响判断 */
    public static clamp(num: number, limit1: number, limit2: number): number {
        let min: number;
        let max: number;
        if (limit1 < limit2) {
            min = limit1;
            max = limit2;
        }
        else {
            min = limit2;
            max = limit1;
        }
        let ret = num < min ? min : num;
        return ret > max ? max : ret;
    }

    /** 求直线p0-p1与直线p2-p3的交点，转为一般式后套用交点公式 */
    public static lineIntersectPoint(x0: number, y0: number, x1: number, y1: number,
        x2: number, y2: number, x3: number, y3: number): cc.Vec2 {
        let A = y0 - y1;
        let B = x1 - x0;
        let C = x0 * y1 - x1 * y0;
        let D = y2 - y3;
        let E = x3 - x2;
        let F = x2 * y3 - x3 * y2;
        let BD_AE = B * D - A * E;
        // 平行
        if (BD_AE === 0) {
            return null;
        }
        let CE_BF = C * E - B * F;
        let AF_CD = A * F - C * D;
        return cc.v2(CE_BF / BD_AE, AF_CD / BD_AE);
    }

    /**
     * 判断线段p0p1与线段p2p3是否相交
     */
    public static segmentsIntersect(x0: number, y0: number, x1: number, y1: number,
        x2: number, y2: number, x3: number, y3: number): boolean {
        // 简单判断不相交情况，同时可以剔除在同一直线上叉积无法判断的情况
        let minX01 = x0 < x1 ? x0 : x1;
        let maxX01 = x0 < x1 ? x1 : x0;
        let minY01 = y0 < y1 ? y0 : y1;
        let maxY01 = y0 < y1 ? y1 : y0;
        let minX23 = x2 < x3 ? x2 : x3;
        let maxX23 = x2 < x3 ? x3 : x2;
        let minY23 = y2 < y3 ? y2 : y3;
        let maxY23 = y2 < y3 ? y3 : y2;
        if (maxX01 < minX23 || maxY01 < minY23 || minX01 > maxX23 || minY01 > maxY23) {
            return false;
        }
        // p2、p3两点均在p0p1同侧，必不相交
        if (XMath.cross(x0, y0, x1, y1, x2, y2) * XMath.cross(x0, y0, x1, y1, x3, y3) > 0) {
            return false;
        }
        // p0、p1两点均在p2p3同侧，必不相交
        if (XMath.cross(x2, y2, x3, y3, x0, y0) * XMath.cross(x2, y2, x3, y3, x1, y1) > 0) {
            return false;
        }
        return true;
    }

    /** 求线段p0-p1与线段p2-p3的交点 */
    public static segmentsIntersectPoint(x0: number, y0: number, x1: number, y1: number,
        x2: number, y2: number, x3: number, y3: number): cc.Vec2 {
        // 相交判定
        if (!this.segmentsIntersect(x0, y0, x1, y1, x2, y2, x3, y3)) return null;
        // 使用直线求交公式求交
        return this.lineIntersectPoint(x0, y0, x1, y1, x2, y2, x3, y3);
    }

    /** 计算点（x0, y0）到直线（Ax + By + C）的最短距离 */
    public static distanceFromPointToNormalLine(x0: number, y0: number, A: number, B: number, C: number) {
        return Math.abs((A * x0 + B * y0 + C) / Math.sqrt(A * A + B * B));
    }

    /** 计算点 (x0, y0) 到两点式直线(y-y1)/(y2-y1)=(x-x1)/(x2-x1)的最短距离 */
    public static distanceFromPointTo2PointLine(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
        let A = y2 - y1;
        let B = x2 - x1;
        let C = x2 * y1 - x1 * y2;
        return this.distanceFromPointToNormalLine(x0, y0, A, B, C);
    }

    /**
     * 判断点pt是否在三角形t0-t1-t2内(含边上)
     * triangleClockwise是为了优化，多点判断时可避免一次重复计算
     */
    public static isPointInTriangle(ptX: number, ptY: number, t0X: number, t0Y: number, t1X: number, t1Y: number, t2X: number, t2Y: number, triangleClockwise?: boolean) {
        let clockwise: boolean = triangleClockwise;
        if (clockwise == null) {
            clockwise = XMath.cross(t0X, t0Y, t1X, t1Y, t2X, t2Y) < 0;
        }
        if ((XMath.cross(t0X, t0Y, t1X, t1Y, ptX, ptY) < 0) !== clockwise) {
            return false;
        }
        if ((XMath.cross(t1X, t1Y, t2X, t2Y, ptX, ptY) < 0) !== clockwise) {
            return false;
        }
        if ((XMath.cross(t2X, t2Y, t0X, t0Y, ptX, ptY) < 0) !== clockwise) {
            return false;
        }
        return true;
    }

    /**
     * 判断点pt是否在凸多边形内，传入多边形需要保证凸性
     */
    public static isPointInConvexPolygon(ptX: number, ptY: number, points: {x: number; y: number}[], polygonClockwise?: boolean) {
        let clockwise: boolean = polygonClockwise;
        if (clockwise == null) {
            clockwise = XMath.cross(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y) <= 0;
        }
        for (let i = 0, len = points.length; i < len; i++) {
            if ((XMath.cross(points[i].x, points[i].y, points[(i + 1) % len].x, points[(i + 1) % len].y, ptX, ptY) <= 0) !== clockwise) {
                return false;
            }
        }
        return true;
    }

    /**
     * 拆分3次bezier的拆分点，拆分后的两个3次bezier拼接形状与拆分前一致
     * 可用于增加控制点
     * 参考 3阶bezier曲线公式：B(t) = start * (1-t)^3 + 3 * c1 * t * (1-t)^2 + 3 * c2 * t^2 * (1-t) + end * t^3, t ∈ [0,1]
     * @param start 起点
     * @param c1 起点控制
     * @param c2 结束点控制
     * @param end 结束点
     * @param t 拆分点，0-1，0对应start，1对应end，注意t与曲线长度非线性对应，如0.5不代表位于曲线中点。
     */
    public static splitCubicBezier(start: cc.Vec2, c1: cc.Vec2, c2: cc.Vec2, end: cc.Vec2, t: number): {start: cc.Vec2; c1: cc.Vec2; c2: cc.Vec2; end: cc.Vec2}[] {
        let a = start.mul(1 - t).add(c1.mul(t));
        let b = c1.mul(1 - t).add(c2.mul(t));
        let c = c2.mul(1 - t).add(end.mul(t));

        let d = a.mul(1 - t).add(b.mul(t));
        let e = b.mul(1 - t).add(c.mul(t));

        let pos = d.mul(1 - t).add(e.mul(t));

        return [{start, c1: a, c2: d, end: pos}, {start: pos, c1: e, c2: c, end}];
    }

    /**
     * 解析计算简单的数学表达式，当前支持 变量、加、减、乘、除、()、变量指定、Math下的函数
     * @param _expression 表达式如：1 + sqrt(2)*abc + d / (5 + e)
     * @param variableMapper 用于查询变量值
     */
    public static evaluate(_expression: string, _variableMapper?: (variable: string) => number): number {
        let expression = _expression.replace(/ /g, '');
        let vMapper = _variableMapper;
        if (vMapper == null) {
            vMapper = (variable: string): number => {
                console.error('未指定查询器');
                return NaN;
            };
        }
        /** 表达式拆分，嵌套括号去最外围为一整体 */
        const split = (expression: string, operator: string): string[] => {
            let result = [];
            let braces = 0;
            let currentChunk = '';
            let lastCh = null;
            for (let curCh of expression) {
                if (curCh === '(') {
                    braces++;
                } else if (curCh === ')') {
                    braces--;
                }
                if (braces === 0 && operator === curCh && (operator !== '-' || (lastCh !== '*' && lastCh !== '/'))) {
                    result.push(currentChunk);
                    currentChunk = '';
                }
                else {
                    currentChunk += curCh;
                }
                lastCh = curCh;
            }
            if (currentChunk !== '') {
                result.push(currentChunk);
            }
            return result;
        };
        /** 函数调用 */
        const functionParse = (expression: string) => {
            let argStart = expression.indexOf('(');
            let funName = expression.substr(0, argStart);
            let strArgs = expression.substring(argStart + 1, expression.length - 1);
            let argsExps = split(strArgs, ',');
            let args = [];
            for (let exp of argsExps) {
                args.push(additionParser(exp));
            }
            if (Math[funName] != null) {
                let result = Math[funName](...args);
                return result;
            }
            else {
                console.error(`非法函数名${funName}`);
                return NaN;
            }
        };
        /** 除法解析 */
        const divisionParser = (expression: string) => {
            const subExps = split(expression, '/');
            const numbers = subExps.map((subExp: string): number => {
                if (subExp[0] === '(') {
                    return additionParser(subExp.substr(1, subExp.length - 2));
                }
                // 如有必要查询变量
                let result = parseFloat(subExp);
                if (isNaN(result)) {
                    if (subExp.indexOf('(') > 0) {
                        return functionParse(subExp);
                    }
                    else {
                        return vMapper(subExp);
                    }
                }
                return result;
            });
            let initialValue = numbers[0];
            return numbers.slice(1).reduce((total, num) => total / num, initialValue);
        };
        /** 乘法解析 */
        const multiplicationParser = (expression: string): number => {
            const subExps = split(expression, '*');
            const numbers = subExps.map((subExp) => {
                return divisionParser(subExp);
            });
            return numbers.reduce((total, num) => total * num, numbers.length > 0 ? 1 : 0);
        };
        /** 减法解析 */
        const substractionParser = (expression: string): number => {
            const subExps = split(expression, '-');
            const numbers = subExps.map((subExp) => {
                return multiplicationParser(subExp);
            });
            const initialValue = numbers[0];
            return numbers.slice(1).reduce((total, num) => total - num, initialValue);
        };
        /** 加法解析 */
        const additionParser = (expression: string): number => {
            const subExps = split(expression, '+');
            const numbers = subExps.map((subExp) => {
                return substractionParser(subExp);
            });
            return numbers.reduce((total, num) => total + num, 0);
        };
        return additionParser(expression);
    }

    public static roughSin(_angle: number) {
        let angle = _angle % 360;
        if (angle < 0) {
            angle += 360;
        }
        angle *= 2;
        let ret = SinTable[Math.round(angle)];
        return ret;
    }

    public static roughCos(angle: number) {
        return this.roughSin(angle + 90);
    }
}

const SinTable = [0, 0.0087, 0.0175, 0.0262, 0.0349, 0.0436, 0.0523, 0.061, 0.0698, 0.0785, 0.0872, 0.0958, 0.1045, 0.1132, 0.1219, 0.1305, 0.1392, 0.1478, 0.1564, 0.165, 0.1736, 0.1822, 0.1908, 0.1994, 0.2079, 0.2164, 0.225, 0.2334, 0.2419, 0.2504, 0.2588, 0.2672, 0.2756, 0.284, 0.2924, 0.3007, 0.309, 0.3173, 0.3256, 0.3338, 0.342, 0.3502, 0.3584, 0.3665, 0.3746, 0.3827, 0.3907, 0.3987, 0.4067, 0.4147, 0.4226, 0.4305, 0.4384, 0.4462, 0.454, 0.4617, 0.4695, 0.4772, 0.4848, 0.4924, 0.5, 0.5075, 0.515, 0.5225, 0.5299, 0.5373, 0.5446, 0.5519, 0.5592, 0.5664, 0.5736, 0.5807, 0.5878, 0.5948, 0.6018, 0.6088, 0.6157, 0.6225, 0.6293, 0.6361, 0.6428, 0.6494, 0.6561, 0.6626, 0.6691, 0.6756, 0.682, 0.6884, 0.6947, 0.7009, 0.7071, 0.7133, 0.7193, 0.7254, 0.7314, 0.7373, 0.7431, 0.749, 0.7547, 0.7604, 0.766, 0.7716, 0.7771, 0.7826, 0.788, 0.7934, 0.7986, 0.8039, 0.809, 0.8141, 0.8192, 0.8241, 0.829, 0.8339, 0.8387, 0.8434, 0.848, 0.8526, 0.8572, 0.8616, 0.866, 0.8704, 0.8746, 0.8788, 0.8829, 0.887, 0.891, 0.8949, 0.8988, 0.9026, 0.9063, 0.91, 0.9135, 0.9171, 0.9205, 0.9239, 0.9272, 0.9304, 0.9336, 0.9367, 0.9397, 0.9426, 0.9455, 0.9483, 0.9511, 0.9537, 0.9563, 0.9588, 0.9613, 0.9636, 0.9659, 0.9681, 0.9703, 0.9724, 0.9744, 0.9763, 0.9781, 0.9799, 0.9816, 0.9833, 0.9848, 0.9863, 0.9877, 0.989, 0.9903, 0.9914, 0.9925, 0.9936, 0.9945, 0.9954, 0.9962, 0.9969, 0.9976, 0.9981, 0.9986, 0.999, 0.9994, 0.9997, 0.9998, 1, 1, 1, 0.9998, 0.9997, 0.9994, 0.999, 0.9986, 0.9981, 0.9976, 0.9969, 0.9962, 0.9954, 0.9945, 0.9936, 0.9925, 0.9914, 0.9903, 0.989, 0.9877, 0.9863, 0.9848, 0.9833, 0.9816, 0.9799, 0.9781, 0.9763, 0.9744, 0.9724, 0.9703, 0.9681, 0.9659, 0.9636, 0.9613, 0.9588, 0.9563, 0.9537, 0.9511, 0.9483, 0.9455, 0.9426, 0.9397, 0.9367, 0.9336, 0.9304, 0.9272, 0.9239, 0.9205, 0.9171, 0.9135, 0.91, 0.9063, 0.9026, 0.8988, 0.8949, 0.891, 0.887, 0.8829, 0.8788, 0.8746, 0.8704, 0.866, 0.8616, 0.8572, 0.8526, 0.848, 0.8434, 0.8387, 0.8339, 0.829, 0.8241, 0.8192, 0.8141, 0.809, 0.8039, 0.7986, 0.7934, 0.788, 0.7826, 0.7771, 0.7716, 0.766, 0.7604, 0.7547, 0.749, 0.7431, 0.7373, 0.7314, 0.7254, 0.7193, 0.7133, 0.7071, 0.7009, 0.6947, 0.6884, 0.682, 0.6756, 0.6691, 0.6626, 0.6561, 0.6494, 0.6428, 0.6361, 0.6293, 0.6225, 0.6157, 0.6088, 0.6018, 0.5948, 0.5878, 0.5807, 0.5736, 0.5664, 0.5592, 0.5519, 0.5446, 0.5373, 0.5299, 0.5225, 0.515, 0.5075, 0.5, 0.4924, 0.4848, 0.4772, 0.4695, 0.4617, 0.454, 0.4462, 0.4384, 0.4305, 0.4226, 0.4147, 0.4067, 0.3987, 0.3907, 0.3827, 0.3746, 0.3665, 0.3584, 0.3502, 0.342, 0.3338, 0.3256, 0.3173, 0.309, 0.3007, 0.2924, 0.284, 0.2756, 0.2672, 0.2588, 0.2504, 0.2419, 0.2334, 0.225, 0.2164, 0.2079, 0.1994, 0.1908, 0.1822, 0.1736, 0.165, 0.1564, 0.1478, 0.1392, 0.1305, 0.1219, 0.1132, 0.1045, 0.0958, 0.0872, 0.0785, 0.0698, 0.061, 0.0523, 0.0436, 0.0349, 0.0262, 0.0175, 0.0087, 0, -0.0087, -0.0175, -0.0262, -0.0349, -0.0436, -0.0523, -0.061, -0.0698, -0.0785, -0.0872, -0.0958, -0.1045, -0.1132, -0.1219, -0.1305, -0.1392, -0.1478, -0.1564, -0.165, -0.1736, -0.1822, -0.1908, -0.1994, -0.2079, -0.2164, -0.225, -0.2334, -0.2419, -0.2504, -0.2588, -0.2672, -0.2756, -0.284, -0.2924, -0.3007, -0.309, -0.3173, -0.3256, -0.3338, -0.342, -0.3502, -0.3584, -0.3665, -0.3746, -0.3827, -0.3907, -0.3987, -0.4067, -0.4147, -0.4226, -0.4305, -0.4384, -0.4462, -0.454, -0.4617, -0.4695, -0.4772, -0.4848, -0.4924, -0.5, -0.5075, -0.515, -0.5225, -0.5299, -0.5373, -0.5446, -0.5519, -0.5592, -0.5664, -0.5736, -0.5807, -0.5878, -0.5948, -0.6018, -0.6088, -0.6157, -0.6225, -0.6293, -0.6361, -0.6428, -0.6494, -0.6561, -0.6626, -0.6691, -0.6756, -0.682, -0.6884, -0.6947, -0.7009, -0.7071, -0.7133, -0.7193, -0.7254, -0.7314, -0.7373, -0.7431, -0.749, -0.7547, -0.7604, -0.766, -0.7716, -0.7771, -0.7826, -0.788, -0.7934, -0.7986, -0.8039, -0.809, -0.8141, -0.8192, -0.8241, -0.829, -0.8339, -0.8387, -0.8434, -0.848, -0.8526, -0.8572, -0.8616, -0.866, -0.8704, -0.8746, -0.8788, -0.8829, -0.887, -0.891, -0.8949, -0.8988, -0.9026, -0.9063, -0.91, -0.9135, -0.9171, -0.9205, -0.9239, -0.9272, -0.9304, -0.9336, -0.9367, -0.9397, -0.9426, -0.9455, -0.9483, -0.9511, -0.9537, -0.9563, -0.9588, -0.9613, -0.9636, -0.9659, -0.9681, -0.9703, -0.9724, -0.9744, -0.9763, -0.9781, -0.9799, -0.9816, -0.9833, -0.9848, -0.9863, -0.9877, -0.989, -0.9903, -0.9914, -0.9925, -0.9936, -0.9945, -0.9954, -0.9962, -0.9969, -0.9976, -0.9981, -0.9986, -0.999, -0.9994, -0.9997, -0.9998, -1, -1, -1, -0.9998, -0.9997, -0.9994, -0.999, -0.9986, -0.9981, -0.9976, -0.9969, -0.9962, -0.9954, -0.9945, -0.9936, -0.9925, -0.9914, -0.9903, -0.989, -0.9877, -0.9863, -0.9848, -0.9833, -0.9816, -0.9799, -0.9781, -0.9763, -0.9744, -0.9724, -0.9703, -0.9681, -0.9659, -0.9636, -0.9613, -0.9588, -0.9563, -0.9537, -0.9511, -0.9483, -0.9455, -0.9426, -0.9397, -0.9367, -0.9336, -0.9304, -0.9272, -0.9239, -0.9205, -0.9171, -0.9135, -0.91, -0.9063, -0.9026, -0.8988, -0.8949, -0.891, -0.887, -0.8829, -0.8788, -0.8746, -0.8704, -0.866, -0.8616, -0.8572, -0.8526, -0.848, -0.8434, -0.8387, -0.8339, -0.829, -0.8241, -0.8192, -0.8141, -0.809, -0.8039, -0.7986, -0.7934, -0.788, -0.7826, -0.7771, -0.7716, -0.766, -0.7604, -0.7547, -0.749, -0.7431, -0.7373, -0.7314, -0.7254, -0.7193, -0.7133, -0.7071, -0.7009, -0.6947, -0.6884, -0.682, -0.6756, -0.6691, -0.6626, -0.6561, -0.6494, -0.6428, -0.6361, -0.6293, -0.6225, -0.6157, -0.6088, -0.6018, -0.5948, -0.5878, -0.5807, -0.5736, -0.5664, -0.5592, -0.5519, -0.5446, -0.5373, -0.5299, -0.5225, -0.515, -0.5075, -0.5, -0.4924, -0.4848, -0.4772, -0.4695, -0.4617, -0.454, -0.4462, -0.4384, -0.4305, -0.4226, -0.4147, -0.4067, -0.3987, -0.3907, -0.3827, -0.3746, -0.3665, -0.3584, -0.3502, -0.342, -0.3338, -0.3256, -0.3173, -0.309, -0.3007, -0.2924, -0.284, -0.2756, -0.2672, -0.2588, -0.2504, -0.2419, -0.2334, -0.225, -0.2164, -0.2079, -0.1994, -0.1908, -0.1822, -0.1736, -0.165, -0.1564, -0.1478, -0.1392, -0.1305, -0.1219, -0.1132, -0.1045, -0.0958, -0.0872, -0.0785, -0.0698, -0.061, -0.0523, -0.0436, -0.0349, -0.0262, -0.0175, -0.0087, 0];
