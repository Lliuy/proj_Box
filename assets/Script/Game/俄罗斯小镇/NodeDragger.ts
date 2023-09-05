/*******************************************************************************
文件: NodeDragger.ts
创建: 2021年02月24日
作者: 刘义
描述:
    结点_拖动结点的脚本
*******************************************************************************/
import LayerGameRussianCity from '../../Layer/LayerGameRussianCity';
import XDragger from '../../XFireControl/XDragger';
import XInstancer from '../../XFireControl/XInstancer';
import { OptionBrick } from './GameRussianCity';

const { ccclass, property } = cc._decorator;

@ccclass
export default class NodeDragger extends cc.Component {
    private static instance: NodeDragger = null;
    public static getInstance(): NodeDragger {
        return NodeDragger.instance;
    }
    @property(cc.Prefab)
    public prefabBrick: cc.Prefab = null;

    /**  可操作砖块 */
    public optionBrick: OptionBrick = null;
    /**  操作区域的编号 */
    public id = 0;
    /**  可拖动三个的初始位置 */
    // private nodeOptionInitPos = [cc.v2(-220, -400), cc.v2(0, -400), cc.v2(220, -400)];
    private nodeOptionInitPos = [cc.v2(-220, 0), cc.v2(0, 0), cc.v2(220, 0)];
    private brickSize = 60;
    private brickSpace = 5;

    public constructor() {
        super();
        NodeDragger.instance = this;
    }

    public onLoad() {
        this.id = Number(XInstancer.getInstParam(this.node));
        this.node.setPosition(this.nodeOptionInitPos[this.id]);
    }

    /**  初始化 */
    public async initBrick(brick: OptionBrick) {
        this.optionBrick = brick;

        if (this.node.childrenCount > 0) {
            this.node.removeAllChildren();
        }

        for (const point of this.optionBrick.brick.points) {
            let brick: cc.Node = cc.instantiate(this.prefabBrick);
            let pos = this.getBrickLocation(point[0], point[1]);

            brick.setContentSize(this.brickSize, this.brickSize);
            brick.parent = this.node;
            brick.color = cc.color().fromHEX(this.optionBrick.brick.color);

            brick.setPosition(pos.x, pos.y - 400);
            brick.runAction(
                cc.sequence(
                    cc.moveTo(0.25, pos.x, pos.y + 100),
                    cc.moveTo(0.1, pos)
                )
            );
        }
    }

    public start() {
        this.node.getComponent(XDragger).onPress(() => {
            this.node.scale = 1;
            for (const iterator of this.node.children) {
                iterator.y += 100;
            }
        });

        this.node.getComponent(XDragger).onMove(() => {
            let topLeftCornerPos = this.getBrickLocation(0, 0);
            topLeftCornerPos.y += 100;

            topLeftCornerPos = this.node.convertToWorldSpaceAR(topLeftCornerPos);
            LayerGameRussianCity.getInstance().refreshshadeBrick(this.optionBrick, topLeftCornerPos);
        });

        this.node.getComponent(XDragger).onUnpress(() => {
            // 左上角的坐标
            let topLeftCornerPos = this.getBrickLocation(0, 0);
            topLeftCornerPos.y += 100;

            topLeftCornerPos = this.node.convertToWorldSpaceAR(topLeftCornerPos);
            let result = LayerGameRussianCity.getInstance().placeBrick(this.optionBrick, topLeftCornerPos);
            if (result) {
                //
                for (const iterator of this.node.children) {
                    iterator.destroy();
                }
                this.node.scale = 0.5;
                this.node.setPosition(this.nodeOptionInitPos[this.id]);
            } else {
                // 不能放置返回初始位置
                {
                    this.node.scale = 0.5;
                    for (const iterator of this.node.children) {
                        iterator.y -= 100;
                    }
                    this.node.setPosition(this.nodeOptionInitPos[this.id]);
                }
            }
        });
    }

    public update(dt) {}

    /**  获取砖块的单个砖块位置 0,0左上 */
    private getBrickLocation(x: number, y: number) {
        let boardWidth = this.optionBrick.brick.width * (this.brickSize + this.brickSpace) - this.brickSpace;
        let boardHeight = this.optionBrick.brick.height * (this.brickSize + this.brickSpace) - this.brickSpace;
        let posX = -boardWidth / 2 + this.brickSize / 2 + x * this.brickSize + x * this.brickSpace;
        let posY = boardHeight / 2 - this.brickSize / 2 - y * this.brickSize - y * this.brickSpace;
        return cc.v2(posX, posY);
    }
}
