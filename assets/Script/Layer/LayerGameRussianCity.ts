/*******************************************************************************
文件: LayerGameRussianCity.ts
创建: 2021年02月24日
作者: 刘义
描述:
    层_游戏_俄罗斯小镇
*******************************************************************************/
import Configs from '../Configs';
import { Cell, GameRussianCity, InstEliminateCol, InstEliminateRow, InstGenCell, InstGenOptionBricks, InstReset, InstructionType, OptionBrick } from '../Game/俄罗斯小镇/GameRussianCity';
import NodeDragger from '../Game/俄罗斯小镇/NodeDragger';
import GameData from '../GameData';
import xfire from '../XFire/xfire';

const { ccclass, property } = cc._decorator;

@ccclass
export default class LayerGameRussianCity extends cc.Component {
    private static instance: LayerGameRussianCity = null;
    public static getInstance(): LayerGameRussianCity {
        return LayerGameRussianCity.instance;
    }
    @property(cc.Prefab)
    public prefabBrick: cc.Prefab = null;
    @property(cc.Prefab)
    public prefabBoardBg: cc.Prefab = null;
    @property(cc.Prefab)
    public prefabPagePause: cc.Prefab = null;
    @property(cc.Prefab)
    public prefabPageEnd: cc.Prefab = null;
    @property(cc.Node)
    public nodeBoardParent: cc.Node = null;
    @property(cc.Node)
    public nodeOptins: cc.Node = null;
    @property(cc.Label)
    public labelScore: cc.Label = null;
    @property(cc.Label)
    public labelMaxScore: cc.Label = null;

    /** 标记正在处理游戏指令中 */
    public dealingInstructions = false;
    /**  游戏逻辑模块 */
    public game: GameRussianCity = null;
    /**  格子间隔 */
    private cellSpace = 5;
    /**  格子大小 */
    private cellSize = 65;
    private cells: cc.Node[] = [];

    public constructor() {
        super();
        LayerGameRussianCity.instance = this;
    }

    /**  显示结算界面 */
    public showPageEnd() {
        let node: cc.Node = cc.instantiate(this.prefabPageEnd);
        node.parent = this.node;
    }

    /**  显示暂停界面 */
    public showPagePause() {
        let node: cc.Node = cc.instantiate(this.prefabPagePause);
        node.parent = this.node;
    }

    public onLoad() {
        this.game = new GameRussianCity();
    }

    public start() {
        this.createBoard();
        this.dealInstructions();
    }

    public update(dt) {}

    public changeCellColor() {
        for (const cell of this.cells) {
            let colorStr = Configs.GameColor.cellColor[Number(GameData.maticMould)];
            cell.color = cc.Color.RED.fromHEX(colorStr);
        }
    }

    /**  重玩 */
    public replay() {
        for (const iterator of this.nodeBoardParent.children) {
            iterator.removeAllChildren();
        }
        this.game.reset();
        this.dealInstructions();
    }

    /**  将砖块放置到棋盘中 */
    public placeBrick(optionBrick: OptionBrick, topLeftCornerPos: cc.Vec2): boolean {
        let x = 0;
        let y = 0;
        for (const cell of this.nodeBoardParent.children) {
            let rect = cell.getBoundingBoxToWorld();
            rect = cc.rect(rect.x, rect.y, rect.width + this.cellSpace, rect.height + this.cellSpace);
            if (rect.contains(topLeftCornerPos)) {
                let index = Number(cell.name);
                x = index % this.game.boardSize.width;
                y = Math.floor(index / this.game.boardSize.width);
                if (this.game.isBrickCanbePlaced(optionBrick.brick, x, y)) {
                    this.game.placeBrick(optionBrick, x, y);
                    this.dealInstructions();
                    return true;
                }
            }
        }
        return false;
    }

    /**  消除阴影 */
    public clareShadeBrick() {
        for (const cell of this.cells) {
            for (const iterator of cell.children) {
                if (iterator.name === '阴影') {
                    iterator.destroy();
                }
            }
        }
    }

    /**  刷新可放置的阴影砖块 */
    public refreshshadeBrick(optionBrick: OptionBrick, topLeftCornerPos: cc.Vec2) {
        let x = 0;
        let y = 0;
        let cells: Cell[] = [];

        this.clareShadeBrick();

        for (const cell of this.nodeBoardParent.children) {
            let rect = cell.getBoundingBoxToWorld();
            rect = cc.rect(rect.x, rect.y, rect.width + this.cellSpace, rect.height + this.cellSpace);
            if (rect.contains(topLeftCornerPos)) {
                let index = Number(cell.name);
                x = index % this.game.boardSize.width;
                y = Math.floor(index / this.game.boardSize.width);
                if (this.game.isBrickCanbePlaced(optionBrick.brick, x, y)) {
                    cells = this.game.getPlaceBrickPos(optionBrick, x, y);

                    for (const cell of cells) {
                        let node: cc.Node = cc.instantiate(this.prefabBrick);
                        node.setContentSize(this.cellSize, this.cellSize);
                        let color = this.game.getBrickColor(optionBrick.brick.id);
                        let multiple = 0.8;
                        node.color = cc.color(color.getR() * multiple, color.getG() * multiple, color.getB() * multiple);
                        node.parent = this.getCell(cell.x, cell.y);
                        node.name = '阴影';
                        node.opacity = 200;
                    }
                }
            }
        }
    }

    public changeAppColor() {
        for (const cell of this.cells) {
            let colorStr = Configs.GameColor.cellColor[Number(GameData.maticMould)];
            cell.color = cc.Color.RED.fromHEX(colorStr);
        }
    }

    private onclickReturn(event: cc.Event, data: string) {
        this.node.dispatchEvent(new cc.Event.EventCustom('jumptocover', true));
    }

    private async refreshOptionNode() {
        let options = this.game.getOptions();

        let i = 0;
        for (const option of options) {
            if (this.nodeOptins.children[i].getComponent(NodeDragger)) {
                await xfire.sleep(i * 0.05);
                this.nodeOptins.children[i].getComponent(NodeDragger).initBrick(option);
                i++;
            }
        }
    }

    private createBoard() {
        let width = this.cellSize * this.game.boardSize.width + this.cellSpace * (this.game.boardSize.width + 1);
        let height = this.cellSize * this.game.boardSize.height + this.cellSpace * (this.game.boardSize.height + 1);
        this.nodeBoardParent.setContentSize(width, height);
        // this.nodeBoardParent.color = cc.color().fromHEX('#9DB18A');
        this.nodeBoardParent.getComponent(cc.Sprite).enabled = false;
        for (let y = 0; y < this.game.boardSize.height; y++) {
            for (let x = 0; x < this.game.boardSize.width; x++) {
                let cell: cc.Node = cc.instantiate(this.prefabBoardBg);
                cell.name = (y * this.game.boardSize.width + x).toString();
                let colorStr = Configs.GameColor.cellColor[Number(GameData.maticMould)];
                cell.color = cc.Color.RED.fromHEX(colorStr);

                cell.setPosition(this.getCellLocation(x, y));
                cell.setContentSize(this.cellSize, this.cellSize);
                cell.parent = this.nodeBoardParent;
                this.cells[y * this.game.boardSize.width + x] = cell;
            }
        }
    }

    /**  获取格子位置 */
    private getCellLocation(x: number, y: number): cc.Vec2 {
        let boardWidth = this.game.boardSize.width * (this.cellSize + this.cellSpace) - this.cellSpace;
        let boardHeight = this.game.boardSize.height * (this.cellSize + this.cellSpace) - this.cellSpace;
        let posX = -boardWidth / 2 + this.cellSize / 2 + x * this.cellSize + x * this.cellSpace;
        let posY = boardHeight / 2 - this.cellSize / 2 - y * this.cellSize - y * this.cellSpace;
        return cc.v2(posX, posY);
    }

    /** 获取格子 */
    private getCell(x: number, y: number): cc.Node {
        let index = y * this.game.boardSize.width + x;
        return this.cells[index];
    }

    private onclickPause(event: cc.Event, data: string) {
        this.showPagePause();
    }

    /****************************************************************************************
     * 指令处理
     *
     *
     ****************************************************************************************/
    private async dealInstructions() {
        if (this.dealingInstructions) {
            return;
        }
        this.dealingInstructions = true;

        let inst = this.game.popInstruction();

        while (inst != null) {
            switch (inst.type) {
                case InstructionType.Reset:
                    await this.dealInstReset(inst as InstReset);
                    break;
                case InstructionType.EliminateCol:
                    await this.dealInstEliminateCol(inst as InstEliminateCol);
                    break;
                case InstructionType.EliminateRow:
                    await this.dealInstEliminateRow(inst as InstEliminateRow);
                    break;
                case InstructionType.GenCell:
                    await this.dealInstGenCell(inst as InstGenCell);
                    break;
                case InstructionType.GenOptionBricks:
                    this.dealInsGenOptionBricks(inst as InstGenOptionBricks);
                    break;
                default:
                    break;
            }
            inst = this.game.popInstruction();
        }
        this.dealingInstructions = false;

        this.labelScore.string = this.game.getScore().toString();

        if (this.game.isGameOver()) {
            this.showPageEnd();
        }
    }

    private dealInstReset(inst: InstReset): Promise<void> {
        return new Promise<void>((resolve) => {
            // console.log('dealInstReset');
            this.clareShadeBrick();

            this.labelMaxScore.string = GameData.maxScore.classicModel.toString();
            resolve();
        });
    }

    private dealInstEliminateCol(inst: InstEliminateCol): Promise<void> {
        return new Promise<void>(async (resolve) => {
            // console.log('dealInstEliminateCol');
            let start = 0;
            for (let y = 0; y < this.game.boardSize.width; y++) {
                let gameCell = this.game.getCell(inst.col, y);
                if (gameCell.age === 0) {
                    start = y;
                    break;
                }
            }

            // 从放入位置消除
            {
                for (let i = 0, len = start <= 5 ? this.game.boardSize.height - start : start; i <= len; i++) {
                    await xfire.sleep(0.01 * i);

                    if (start - i >= 0) {
                        let downCell = this.getCell(inst.col, start - i);
                        let downGameCell = this.game.getCell(inst.col, start - i);
                        downGameCell.num = 0;
                        if (downCell.childrenCount > 0) {
                            let brick = downCell.getChildByName('结点_方块');
                            if (brick) {
                                brick.runAction(
                                    cc.sequence(
                                        cc.scaleTo(0.1, 0),
                                        cc.callFunc(() => {
                                            brick.destroy();
                                        })
                                    )
                                );
                            }
                        }
                    }
                    if (start + i < this.game.boardSize.height) {
                        let topCell = this.getCell(inst.col, start + i);
                        let topGameCell = this.game.getCell(inst.col, start + i);
                        topGameCell.num = 0;
                        if (topCell.childrenCount > 0) {
                            let brick = topCell.getChildByName('结点_方块');
                            if (brick) {
                                brick.runAction(
                                    cc.sequence(
                                        cc.scaleTo(0.1, 0),
                                        cc.callFunc(() => {
                                            brick.destroy();
                                        })
                                    )
                                );
                            }
                        }
                    }
                    // }
                }
            }

            {
                // 从头消除
                // for (let y = 0; y < this.game.boardSize.width; y++) {
                //     this.game.getCell(inst.col, y).num = 0;
                //     await xfire.sleep(0.01 * y);
                //     let cell = this.getCell(inst.col, y);
                //     if (cell.childrenCount > 0) {
                //         let brick = cell.getChildByName('结点_方块');
                //         if (brick) {
                //             brick.runAction(
                //                 cc.sequence(
                //                     cc.scaleTo(0.1, 0),
                //                     cc.callFunc(() => {
                //                         brick.destroy();
                //                     })
                //                 )
                //             );
                //         }
                //     }
                // }
            }
            this.clareShadeBrick();

            resolve();
        });
    }

    private dealInstEliminateRow(inst: InstEliminateRow): Promise<void> {
        return new Promise<void>(async (resolve) => {
            // console.log('dealInstEliminateRow');
            let start = 0;
            for (let x = 0; x < this.game.boardSize.width; x++) {
                let gameCell = this.game.getCell(x, inst.row);
                if (gameCell.age === 0) {
                    start = x;
                    break;
                }
            }

            // 从放入位置消除
            {
                for (let i = 0, len = start <= 5 ? this.game.boardSize.width - start : start; i <= len; i++) {
                    await xfire.sleep(0.01 * i);

                    if (start - i >= 0) {
                        let leftCell = this.getCell(start - i, inst.row);
                        let leftGameCell = this.game.getCell(start - i, inst.row);
                        leftGameCell.num = 0;
                        if (leftCell.childrenCount > 0) {
                            let brick = leftCell.getChildByName('结点_方块');
                            if (brick) {
                                brick.runAction(
                                    cc.sequence(
                                        cc.scaleTo(0.1, 0),
                                        cc.callFunc(() => {
                                            brick.destroy();
                                        })
                                    )
                                );
                            }
                        }
                    }
                    if (start + i < this.game.boardSize.width) {
                        let rightCell = this.getCell(start + i, inst.row);
                        let rightGameCell = this.game.getCell(start + i, inst.row);
                        rightGameCell.num = 0;
                        if (rightCell.childrenCount > 0) {
                            let brick = rightCell.getChildByName('结点_方块');
                            if (brick) {
                                brick.runAction(
                                    cc.sequence(
                                        cc.scaleTo(0.1, 0),
                                        cc.callFunc(() => {
                                            brick.destroy();
                                        })
                                    )
                                );
                            }
                        }
                    }
                    // }
                }
            }

            {
                // 从头消除
                // for (let x = 0; x < this.game.boardSize.width; x++) {
                //     await xfire.sleep(0.01 * x);
                //     let cell = this.getCell(x, inst.row);
                //     let gameCell = this.game.getCell(x, inst.row);
                //     console.log(gameCell);
                //     gameCell.num = 0;
                //     if (cell.childrenCount > 0) {
                //         let brick = cell.getChildByName('结点_方块');
                //         if (brick) {
                //             brick.runAction(
                //                 cc.sequence(
                //                     cc.scaleTo(0.1, 0),
                //                     cc.callFunc(() => {
                //                         brick.destroy();
                //                     })
                //                 )
                //             );
                //         }
                //     }
                // }
            }
            this.clareShadeBrick();

            resolve();
        });
    }

    private dealInstGenCell(inst: InstGenCell): Promise<void> {
        return new Promise<void>((resolve) => {
            // console.log('dealInstGenCell');
            for (const cell of inst.cells) {
                let node: cc.Node = cc.instantiate(this.prefabBrick);
                node.setContentSize(this.cellSize, this.cellSize);
                node.color = this.game.getBrickColor(cell.num);
                node.parent = this.getCell(cell.x, cell.y);
            }
            this.clareShadeBrick();

            resolve();
        });
    }

    private dealInsGenOptionBricks(inst: InstGenOptionBricks): Promise<void> {
        return new Promise<void>((resolve) => {
            // console.log('dealInsGenOptionBricks');
            this.refreshOptionNode();
            resolve();
        });
    }
}
