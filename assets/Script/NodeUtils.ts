/*******************************************************************************
文件: NodeUtils.ts
创建: 2022年01月07日
作者: 老张(zwx@xfire.mobi)
描述:
	通过路径访问节点及相关功能
*******************************************************************************/

import xfire from './XFire/xfire';
import XAniNumber from './XFireControl/XAniNumber';

export default class NodeUtils {
	/** 通过路径获取节点，path空则返回root */
	public static findNode(root: cc.Node, path: string): cc.Node {
		let node = (path == null || path === '') ? root : cc.find(path, root);
		return node;
	}

	/** 获取目标结点上的某个组件 */
	public static getNodeComponent<T extends cc.Component>(root: cc.Node, nodePath: string, cmp: { prototype: T }): T {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;
		return node.getComponent(cmp);
	}

	/** 目标结点添加某个组件 */
	public static addNodeComponent<T extends cc.Component>(root: cc.Node, nodePath: string, cmp: { prototype: T }): T {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return null;
		return node.addComponent(cmp as any);
	}

	/** 设置目标结点颜色 */
	public static setNodeColor(root: cc.Node, nodePath: string, color: cc.Color) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;
		node.color = color;
	}

	/** 设置目标结点不透明度 */
	public static setNodeOpacity(root: cc.Node, nodePath: string, opacity: number) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;
		node.opacity = opacity;
	}

	/** 设置目标结点label值 */
	public static setNodeLabel(root: cc.Node, nodePath: string, value: string | number) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let label = node.getComponent(cc.Label);
		if (label) {
			if (value == null) {
				console.warn(`值为空，结点：${nodePath}`);
			} else {
				let str = value.toString();
				if (label.string != str) {
					label.string = str;
				}
			}
		} else {
			console.warn(`Label不存在`, nodePath, root);
		}
	}

	/** 设置目标结点richtext值 */
	public static setNodeRichText(root: cc.Node, nodePath: string, value: string | number) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let label = node.getComponent(cc.RichText);
		if (label) {
			if (value == null) {
				console.error(`值为空，结点：${nodePath}`);
			}
			else {
				label.string = value.toString();
			}
		}
	}

	/** 设置目标结点XAniNumber值 */
	public static setNodeAniNumber(root: cc.Node, nodePath: string, value: number, atonce?: boolean) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let label = node.getComponent(XAniNumber);
		if (label) {
			if (value == null) {
				console.error(`值为空，结点：${nodePath}`);
			}
			else {
				if (atonce === true) {
					label.setNumberAtOnce(value);
				}
				else {
					label.number = value;
				}
			}
		}
	}

	/**
	 * 设置目标结点标签材质
	 * Utils.setNodeLabelMaterial(node, '奖品/金币/数值', GameData.challengeProgress < cfg.完成条件 ? '2d-gray-sprite' : '2d-sprite');
	 */
	public static setNodeLabelMaterial(root: cc.Node, nodePath: string, _material: cc.Material | string) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let label = node.getComponent(cc.Label);
		if (label) {
			let material: cc.Material = typeof _material === 'string' ? cc.MaterialVariant.createWithBuiltin(_material, label) : _material;
			label.setMaterial(0, material);
		}
	}

	/** 设置目标结点图片 */
	public static setNodeSprite(root: cc.Node, nodePath: string, spriteFrame: cc.SpriteFrame) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let sprite = node.getComponent(cc.Sprite);
		if (sprite) {
			sprite.spriteFrame = spriteFrame;
		}
	}

	public static setNodeSpriteFrame(root: cc.Node, nodePath: string, spriteFrame: cc.SpriteFrame) {
		try {
			let node = nodePath == null || nodePath === '' ? root : cc.find(nodePath, root);
			if (!node) return;
			let sprite = node.getComponent(cc.Sprite);
			if (sprite) {
				sprite.spriteFrame = spriteFrame;
			}
		} catch (error) {
			console.log('setNodeSpriteFrame', error);
		}
	}

	/**
	 * 设置目标结点图片材质
	 * Utils.setNodeSpriteMaterial(node, '奖品/金币/图标', GameData.challengeProgress < cfg.完成条件 ? '2d-gray-sprite' : '2d-sprite');
	 */
	public static setNodeSpriteMaterial(root: cc.Node, nodePath: string, _material: cc.Material | string) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let sprite = node.getComponent(cc.Sprite);
		if (sprite) {
			let material: cc.Material = typeof _material === 'string' ? cc.MaterialVariant.createWithBuiltin(_material, sprite) : _material;
			sprite.setMaterial(0, material);
		}
	}

	/** 设置目标结点图片 */
	public static setNodeSpriteRange(root: cc.Node, nodePath: string, range: number) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let sprite = node.getComponent(cc.Sprite);
		if (sprite) {
			sprite.fillRange = range;
		}
	}

	/** 设置目标结点按钮可交互性 */
	public static setNodeButtonInteractable(root: cc.Node, nodePath: string, interactable: boolean) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;

		let button = node.getComponent(cc.Button);
		if (button) {
			button.interactable = interactable;
		}
	}

	/** 获取结点的世界坐标 */
	public static getNodeWorldPos(root: cc.Node, nodePath = ''): cc.Vec2 {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;
		return node.convertToWorldSpaceAR(cc.v2(0, 0));
	}

	/** 播放结点上的动画 */
	public static playNodeAnimation(root: cc.Node, nodePath: string, clipName: string): cc.Animation {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;
		let ani = node.getComponent(cc.Animation);
		if (ani) {
			ani.play(clipName);
		}
		return ani;
	}

	/** 设置目标结点是否激活 */
	public static setNodeActive(root: cc.Node, nodePath: string, active: boolean) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) {
			console.warn('node null ', nodePath);
			return;
		}
		if (node.active != active) {
			node.active = active;
		}
	}

	/** 设置目标结点缩放 */
	public static setNodeScale(root: cc.Node, nodePath: string, scale: number) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;
		if (node.scale != scale) {
			node.scale = scale;
		}
	}

	/** 设置结点位置 */
	public static setNodePosition(root: cc.Node, nodePath: string, xOrPosition: number | cc.Vec2 | cc.Vec3, y?: number) {
		let node = (nodePath == null || nodePath === '') ? root : cc.find(nodePath, root);
		if (!node) return;
		if (typeof xOrPosition === 'number') {
			node.x = xOrPosition;
			if (typeof y === 'number') {
				node.y = y;
			}
		}
		else if (typeof xOrPosition === 'object') {
			node.setPosition(xOrPosition.x, xOrPosition.y);
		}
	}

	/** 动态绑定按钮事件 */
	public static bindButtonClickListener(root: cc.Node, path: string, listener: (event: cc.Event, customData?: string) => void, customData?: number | string) {
		if (root == null) {
			return;
		}
		let node = (path == null || path === '') ? root : cc.find(path, root);
		if (node == null) return;
		let btn = node.getComponent(cc.Button);
		if (btn) {
			let eventHandler = new cc.Component.EventHandler();
			eventHandler.target = btn.node;
			eventHandler.component = 'cc.Button';
			let handlerName = 'onclickDynamic_' + xfire.currentTimeMillis;
			while (btn[handlerName] != null) {
				handlerName = 'onclickDynamic_' + xfire.currentTimeMillis + xfire.getRandomInteger(0, 10000);
			}
			eventHandler.handler = handlerName;
			eventHandler.customEventData = customData == null ? '' : customData.toString();
			(btn as any)[handlerName] = listener;
			if (btn.clickEvents == null) btn.clickEvents = [];
			btn.clickEvents.push(eventHandler);
		}
	}
	public static clearButtonClickListener(root: cc.Node, path: string) {
		if (root == null) {
			return;
		}
		let node = (path == null || path === '') ? root : cc.find(path, root);
		if (node == null) return;
		let btn = node.getComponent(cc.Button);
		if (btn) {
			btn.clickEvents = [];
		}
	}

	public static createChildNode<T extends cc.Component>(parent: cc.Node, childName: string, cmp?: { prototype: T }): T {
		if (parent == null) return null;

		let child = new cc.Node(childName);
		let component = child.addComponent(cmp as any);
		// if (frame) sprite.spriteFrame = frame;
		child.parent = parent;
		return component as T;
	}

	/**  设置节点的世界坐标 */
	public static setNodeWorldPosition(node: cc.Node, worldPos: cc.Vec2) {
		if (node && node.parent) {
			let pos = node.parent.convertToNodeSpaceAR(worldPos);
			node.setPosition(pos);
		}
	}

	public static setTargetPositionToNode(node: cc.Node, targeNode: cc.Node) {
		let worldPos = NodeUtils.getNodeWorldPos(targeNode);
		NodeUtils.setNodeWorldPosition(node, worldPos);
	}

	public static convertToNodeSpaceAR(node: cc.Node, worldPos: cc.Vec2) {
		let pos = cc.v2(0, 0);
		if (node && node.parent) {
			pos = node.parent.convertToNodeSpaceAR(worldPos);
		}
		return pos;
	}
}
