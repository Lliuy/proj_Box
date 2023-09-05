/*******************************************************************************
文件: Box2DUtils.ts
创建: 2020年06月10日
作者: 老张(zwx@xfire.mobi)
描述:
    针对CocosCreator下box2d物理引擎的一些实用接口
*******************************************************************************/

export default class Box2DUtils {
    /**
     * 获取结点（不含子结点）【有效】接触数，
     * 可以用此接口判断结点是否与其他结点接触
     * @param node 带cc.RigidBody组件的结点
     */
    public static getContactCount(node: cc.Node) {
        let body = node.getComponent(cc.RigidBody);
        let contactList = body._b2Body.GetContactList();
        let count = 0;
        while (contactList) {
            // box2d的刚体接口获取的接触列表是基于包围盒检测的，所以还需要判断
            if (contactList.contact.IsTouching()) {
                count++;
            }
            contactList = contactList.next;
        }
        return count;
    }

    /**
     * 调节Box2d模拟速度，指定帧数可以抹平帧率变化带来的效果差异
     * @param speedRatio 加速倍数，1为原始速度，2为原始两倍，0.5为原始一半
     * @param fps 物理世界刷新帧率，默认为cc.game.config['frameRate']
     * @example
     * Box2DUtils.setSimSpeed(2);
     */
    public static setSimSpeed(speedRatio: number, _fps: number = null) {
        if (cc.PhysicsManager == null) {
            console.error('cc.PhysicsManager is null');
            return;
        }
        let proto: any = cc.PhysicsManager.prototype;
        if (proto._oldUpdate == null) {
            proto._oldUpdate = cc.PhysicsManager.prototype.update;
            // tslint:disable-next-line: only-arrow-functions
            cc.PhysicsManager.prototype.update = function (_dt: number) {
                let dt = _dt * this._speedRatio;
                this._oldUpdate(dt);
            };
        }
        let fps = _fps == null ? cc.game.config.frameRate : _fps;
        let manager: any = cc.director.getPhysicsManager();
        manager.enabledAccumulator = true;
        manager._speedRatio = speedRatio;
        cc.PhysicsManager.FIXED_TIME_STEP = speedRatio / fps;
    }

    /**
     * 显示box2d调试辅助图形
     * @param shape 是否显示碰撞组件形状
     * @param aabb 是否显示刚体包围盒
     * @param joint 是否显示关节
     */
    public static setDebugDrawFlags(shape: boolean, aabb: boolean, joint: boolean) {
        let flags = 0;
        if (shape) {
            flags |= cc.PhysicsManager.DrawBits.e_shapeBit;
        }
        if (aabb) {
            flags |= cc.PhysicsManager.DrawBits.e_aabbBit;
        }
        if (joint) {
            flags |= cc.PhysicsManager.DrawBits.e_jointBit;
        }
        cc.director.getPhysicsManager().debugDrawFlags = flags;
    }

    /**
     * 设置每米像素数，默认为32
     * @param pixelsPerMeter 每米像素数
     */
    public static setPixelsPerMeter(pixelsPerMeter: number) {
        let ccapi = cc as any;
        if (!ccapi.physicsTypes) {
            console.error('physicsTypes is null, check engin version');
            return;
        }
        ccapi.physicsTypes.PTM_RATIO = pixelsPerMeter;
    }
}
