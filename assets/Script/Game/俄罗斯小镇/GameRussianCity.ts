/*******************************************************************************
文件: GameRussianCity.ts
创建: 2021年02月23日
作者: 老张(zwx@xfire.mobi)
描述:
    独立的【俄罗斯小镇】游戏模块

玩法命名备选：俄罗斯小镇，围城点将

玩法：
    1.在n*n的棋盘里填充俄罗斯砖块，当某行、列填满时予以消除。
    2.每轮由玩家进行x步操作，随机等概率提供x个俄罗斯图形给玩家选择，
    3.如果棋盘内没有空间供玩家放置了，则游戏失败

俄罗斯方块形状定义19种：
口  口  口  口  口
    口  口  口  口
        口  口  口
            口  口
                口

口口  口口口  口口口口  口口口口口

口口  口口    口  口
口      口  口口  口口

口口口  口口口      口  口
口          口      口  口
口          口  口口口  口口口

口口    口口口
口口    口口口
        口口口
*******************************************************************************/

import xfire from "../../XFire/xfire";

const DOC_VERSION_1 = 1;

export class GameRussianCity {
    /**  是否使用锤子 */
    public isHammer = false;
    public isChange = false;
    public width = 5;
    public height = 5;
    public step = 0;
    public stepCountAfterLoad = 0;

    public changeCells: Cell[] = [];

    /** 棋盘格子数组，从上到下，从左到右 */
    public cells: Cell[] = [];

    /** 可用的俄罗斯形状 */
    private brickShapes: BrickShape[] = [
        /** 竖向5形状 */
        {id: 1, width: 1, height: 1, points: [[0, 0]], color: '#7E87BD'},
        {id: 2, width: 1, height: 2, points: [[0, 0], [0, 1]], color: '#F6C85A'},
        {id: 3, width: 1, height: 3, points: [[0, 0], [0, 1], [0, 2]], color: '#E09958'},
        {id: 4, width: 1, height: 4, points: [[0, 0], [0, 1], [0, 2], [0, 3]], color: '#D87183'},
        {id: 5, width: 1, height: 5, points: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], color: '#CD6C5B'},
        /** 横向4形状 */
        {id: 6, width: 2, height: 1, points: [[0, 0], [1, 0]], color: '#F6C85A'},
        {id: 7, width: 3, height: 1, points: [[0, 0], [1, 0], [2, 0]], color: '#E09958'},
        {id: 8, width: 4, height: 1, points: [[0, 0], [1, 0], [2, 0], [3, 0]], color: 'D87183'},
        {id: 9, width: 5, height: 1, points: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], color: '#CD6C5B'},
        /** 小直角 */
        {id: 10, width: 2, height: 2, points: [[0, 0], [1, 0], [0, 1]], color: '#79C98B'},
        {id: 11, width: 2, height: 2, points: [[0, 0], [1, 0], [1, 1]], color: '#79C98B'},
        {id: 12, width: 2, height: 2, points: [[1, 0], [0, 1], [1, 1]], color: '#79C98B'},
        {id: 13, width: 2, height: 2, points: [[0, 0], [0, 1], [1, 1]], color: '#79C98B'},
        /** 大直角 */
        {id: 14, width: 3, height: 3, points: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], color: '#76BCE1'},
        {id: 15, width: 3, height: 3, points: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], color: '#76BCE1'},
        {id: 16, width: 3, height: 3, points: [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]], color: '#76BCE1'},
        {id: 17, width: 3, height: 3, points: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], color: '#76BCE1'},
        /** 小、大方块 */
        {id: 18, width: 2, height: 2, points: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#A7DA69'},
        {id: 19, width: 3, height: 3, points: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], color: '#75D1B2'}
    ];

    /**  加载的存档保存时间 如果存档加载后没有进行游戏而是触发再次存档 那么会存储此时间 */
    private docTime = 0;

    /** 棋盘大小，默认10*10 */
    private _boardSize = { width: 10, height: 10 };
    /** 每轮可选图形数量 */
    private optionCount = 3;
    /** 生成数字以及概率 */
    private genNums: number[] = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5];
    private score = 0;
    /** 指令集 */
    private instructions: Instruction[] = [];
    /** 可选操作图形 */
    private options: OptionBrick[] = [];

    public constructor(_params?: { boardWidth?: number; boardHeight?: number; initNums?: number[]; optionCount?: number }) {
        this.reset(_params);
    }

    public reset(_params?: { boardWidth?: number; boardHeight?: number; initNums?: number[]; optionCount?: number }) {
        let params = _params || {};
        if (params.boardWidth) this._boardSize.width = params.boardWidth;
        if (params.boardHeight) this._boardSize.height = params.boardHeight;
        if (params.optionCount) this.optionCount = params.optionCount;
        // 初始数字生成
        let cells = (this.cells = new Array<Cell>(this.width * this.height));
        for (let y = 0; y < this._boardSize.height; y++) {
            for (let x = 0; x < this._boardSize.width; x++) {
                let index = y * this.boardSize.width + x;
                cells[index] = { num: 0, x, y, age: Number.MAX_VALUE };
                if (params.initNums != null && params.initNums.length === this.boardSize.width * this.boardSize.height) {
                    cells[index].num = params.initNums[index];
                }
            }
        }

        this.score = 0;
        this.step = 0;
        this.stepCountAfterLoad = 0;
        this.genOptions();

        this.instructions.push(new InstReset(this));
    }

    /** 获取棋盘大小 */
    public get boardSize(): { width: number; height: number } {
        return { width: this._boardSize.width, height: this._boardSize.height };
    }

    public random(): number {
        return Math.floor(Math.random() * 1000);
    }

    /** 弹出并返回指令，没有指令后就返回null */
    public popInstruction(): Instruction {
        return this.instructions.shift();
    }

    /** 获取剩余指令数 */
    public get instructionsCount(): number {
        return this.instructions.length;
    }

    /** 查看指令，不会弹出 */
    public peekInstruction(index: number): Instruction {
        if (index < 0 || index >= this.instructionsCount) {
            return null;
        }
        return this.instructions[index];
    }

    public getScore(): number {
        return this.score;
    }

    public getBrickColor(id: number): cc.Color {
        let color = new cc.Color().fromHEX(this.brickShapes[id - 1].color);
        return color;
    }

    /**  获得最大数字 */
    public getMaxCellNum() {
        let max = 0;
        for (const cell of this.cells) {
            if (cell.num > max) {
                max = cell.num;
            }
        }
        return max;
    }

    /** 判断格子是否空 */
    public isCellEmpty(xOrCell: number | Cell, y?: number): boolean {
        let cell: Cell = typeof xOrCell === 'object' ? xOrCell : this.getCell(xOrCell, y);
        if (cell == null) {
            return false;
        }
        return cell.num === 0;
    }

    public getCell(x: number, y: number): Cell {
        if (x < 0 || y < 0 || x >= this.boardSize.width || y >= this.boardSize.height) {
            return;
        }
        return this.cells[y * this.boardSize.width + x];
    }

    /** 生成可选图形，会自动调用，一般不需要主动使用，除非做计费如刷新道具 */
    public genOptions(_count?: number): void {
        let count = _count == null ? this.optionCount : _count;
        this.options = [];
        for (let i = 0; i < count; i++) {
            this.options.push({ index: i, placed: false, brick: xfire.copy(xfire.getRandomMember(this.brickShapes)) });
        }

        this.instructions.push(new InstGenOptionBricks());
    }

    /** 获取可选操作图形 */
    public getOptions(): { index: number; brick: BrickShape; placed: boolean }[] {
        return this.options;
    }

    /**
     * 将某个可选砖块放置入棋盘中
     * @param option 可选砖块
     * @param posX 位置
     * @param posY 位置
     */
    public placeBrick(option: OptionBrick, posX: number, posY: number): void {
        if (option.placed) {
            console.error('砖块已经放置过');
            return;
        }
        if (!this.isBrickCanbePlaced(option.brick, posX, posY)) {
            return;
        }
        this.step++;
        // 所有已有格子年龄加1
        for (let cell of this.cells) {
            if (cell.num === 0) {
                continue;
            }
            cell.age = cell.age < Number.MAX_VALUE ? cell.age + 1 : Number.MAX_VALUE;
        }
        // 生成新格子
        let newCells: Cell[] = [];
        for (let pt of option.brick.points) {
            option.placed = true;
            let cell = this.getCell(posX + pt[0], posY + pt[1]);
            cell.num = option.brick.id;
            cell.age = 0;
            this.score += 1;
            newCells.push(cell);
        }
        if (newCells.length > 0) {
            this.instructions.push(new InstGenCell(newCells));
        }
        // 消除
        this.searchAndEliminate();
        // 生成新可选砖块
        {
            let needToGen = true;
            for (let option of this.options) {
                if (!option.placed) {
                    needToGen = false;
                    break;
                }
            }
            if (needToGen) {
                this.genOptions();
            }
        }
    }

    public getPlaceBrickPos(option: OptionBrick, posX: number, posY: number): Cell[] {
        // 生成新格子
        let newCells: Cell[] = [];
        for (let pt of option.brick.points) {
            let cell = this.getCell(posX + pt[0], posY + pt[1]);
            newCells.push(cell);
        }
        return newCells;
    }

    /**
     * 判断棋盘能否放下某个砖块，能放下则返回一个位置
     * @param brick 砖头
     * @param posX 可选，填写将只判断指定位置，否则判断整个棋盘
     * @param posY 可选
     */
    public isBrickCanbePlaced(brick: BrickShape, posX?: number, posY?: number): [number, number] {
        let testWholeBoard = posX == null || posY == null;
        let bw = this.boardSize.width - brick.width;
        let bh = this.boardSize.height - brick.height;
        let test = (x: number, y: number): boolean => {
            let match = true;
            for (let pt of brick.points) {
                if (!this.isCellEmpty(x + pt[0], y + pt[1])) {
                    match = false;
                    break;
                }
            }
            return match;
        };
        if (testWholeBoard) {
            for (let y = 0; y <= bh; y++) {
                for (let x = 0; x <= bw; x++) {
                    let match = test(x, y);
                    if (match) {
                        return [x, y];
                    }
                }
            }
        } else {
            let match = test(posX, posY);
            if (match) {
                return [posX, posY];
            }
        }
        return null;
    }

    public isGameOver(): boolean {
        for (let option of this.options) {
            if (option.placed) {
                continue;
            }
            if (this.isBrickCanbePlaced(option.brick)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 盘面变化时搜索盘面并消除，优先搜索可消除十字，次行，再列
     * 算法原理：
     *      扫描棋盘，统计每行、列的非空格数，如果非空格数等于棋盘宽、高则表示可消除
     */
    private searchAndEliminate(): boolean {
        /** 行、列非空格子统计 */
        let rows: number[] = [];
        let cols: number[] = [];
        // 遍历统计
        for (let y = 0; y < this.boardSize.height; y++) {
            for (let x = 0; x < this.boardSize.width; x++) {
                let cell = this.getCell(x, y);
                rows[y] = (rows[y] || 0) + (cell.num !== 0 ? 1 : 0);
                cols[x] = (cols[x] || 0) + (cell.num !== 0 ? 1 : 0);
            }
        }

        // 生成结果
        for (let i = 0; i < rows.length; i++) {
            if (rows[i] === this.boardSize.width) {
                this.score += 10;
                this.instructions.push(new InstEliminateRow(i));
            }
        }
        for (let i = 0; i < cols.length; i++) {
            if (cols[i] === this.boardSize.width) {
                this.score += 10;
                this.instructions.push(new InstEliminateCol(i));
            }
        }
        return true;
    }
}

/** 俄罗斯形状定义，由坐标组成 */
export interface BrickShape {
    /**  颜色16进制 */
    color: string;
    id: number;
    /** 形状宽 */
    width: number;
    /** 形状高 */
    height: number;
    /** 坐标左上角为原点，y向下，x向右，如口口定义为[[0, 0], [1, 0]]  */
    points: [number, number][];
}

/** 每轮的可选操作砖块 */
export interface OptionBrick {
    index: number;
    brick: BrickShape;
    placed: boolean;
}

export interface Cell {
    /** 0表格子未填充，否则id为相应的俄罗斯方块id */
    num: number;
    x: number;
    y: number;
    /** 表示格子创建的先后顺序，可用于做特效，刚添加的结点age为0 */
    age: number;
}

export enum InstructionType {
    Reset = 1,
    /** 生成可选砖块 */
    GenOptionBricks = 2,
    /** 消除行 */
    EliminateRow = 4,
    /** 消除列 */
    EliminateCol = 5,
    /** 生成格子 */
    GenCell = 6
}

/** 操作指令 */
export class Instruction {
    public type: InstructionType;
}

/** 游戏初始化指令，重置时也会发出 */
export class InstReset extends Instruction {
    public cells: Cell[];

    public constructor(game: GameRussianCity) {
        super();
        this.type = InstructionType.Reset;
        this.cells = xfire.copy(game.cells);
    }
}

/** 可选砖块生成 */
export class InstGenOptionBricks extends Instruction {
    public constructor() {
        super();
        this.type = InstructionType.GenOptionBricks;
    }
}

/** 行消除指令 */
export class InstEliminateRow extends Instruction {
    /** 要消除的行 */
    public row: number;

    public constructor(row: number) {
        super();
        this.type = InstructionType.EliminateRow;
        this.row = row;
    }
}

/** 列消除指令 */
export class InstEliminateCol extends Instruction {
    /** 要消除的行 */
    public col: number;

    public constructor(col: number) {
        super();
        this.type = InstructionType.EliminateCol;
        this.col = col;
    }
}

/** 格子生成 */
export class InstGenCell extends Instruction {
    /** 生成格子 */
    public cells: Cell[] = [];

    public constructor(cells: Cell | Cell[]) {
        super();
        this.type = InstructionType.GenCell;
        if (Array.isArray(cells)) {
            this.cells = xfire.copy(cells as Cell[]);
        } else {
            let cell = cells as Cell;
            this.cells.push({ x: cell.x, y: cell.y, num: cell.num, age: cell.age });
        }
    }
}
