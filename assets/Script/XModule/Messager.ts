/*******************************************************************************
文件: Messager.ts
创建: 2020年06月22日
作者: 老张(zwx@xfire.mobi)
描述:
    消息模块
    ✦添加监听函数时可直接接收消息类型为参数
    ✦可以使用装饰器注册监听

接口：
    @listen                 装饰器，自动注册监听函数
    addListener             手动添加监听函数
    removeListener          移除监听函数
    removeListenersByTarget 移除某个对象的所有监听函数
    dispatchMessage         同步发送并处理消息
    postMessage             异步发送消息

消息定义规范：
    ✦在Script目录下创建Messages.ts
    ✦在Messages.ts里定义游戏用到的消息类型，消息类型必须继承自Msg，命名以Msg开头
    ✦范例：
        export class MsgGoldChanged extends Msg {
            public gold = 0;
        }
    ✦如果消息监听函数非箭头函数，应该以【on + 消息类型名】为函数名

范例1，手动添加、删除监听：
    @ccclass
    export default class LayerTestMessager extends cc.Component {
        private onEnable() {
            MsgMgr.addListener(MsgGoldChanged, (msg) => {
                App.getInstance().showToast('收到消息：' + JSON.stringify(msg));
            }, this);
        }

        private onDisable() {
            MsgMgr.removeListenersByTarget(this);
        }
    }

范例2，使用装饰器注册监听：
    // 使用装饰器注册的监听会随组件onEnable、onDisable自动注册、删除
    @ccclass
    export default class LayerTestMessager extends cc.Component {
        @listen(MsgPlayerDead)
        private onMsgPlayerDead(msg: MsgPlayerDead) {
            console.log('onPlayerDead listen', this);
        }
    }

范例3，发送消息：
    private onclickDispatchMessage(event: cc.Event, data: string) {
        let msg = new MsgGoldChanged();
        msg.gold = xfire.getRandomInteger(0, 100);
        MsgMgr.dispatchMessage(msg);
        MsgMgr.dispatchMessage(new MsgPlayerDead());
    }

*******************************************************************************/

/** 给每个消息类型分配id，因为Function不好作为key */
let msgClassId = 1;

/** 消息基类 */
export class Msg {
    private seq: number;
    public constructor () {
        let proto = (this as any).__proto__.constructor.prototype;
        if (proto._msgid == null) {
            proto._msgid = msgClassId++;
        }
    }
}

// tslint:disable: no-invalid-this
/**
 * 监听函数装饰器
 * 作用于cc.Component组件函数时，监听函数随组件enabled属性注册、删除
 * 作用于类的静态函数时，会持久注册
 * @param msgClass 监听的消息类原型
 */
export function listen<MsgType extends Msg> (msgClass: { prototype: MsgType } & Function) {
    // tslint:disable-next-line: only-arrow-functions
    return function (target: any, key: string, desc: PropertyDescriptor) {
        let isComponent = target instanceof cc.Component;
        if (!isComponent && typeof target !== 'function') {
            console.error('listen装饰器必须用在cc.Component内或者类的静态成员函数上');
            return;
        }
        if (isComponent) {
            let configs = (target as any)._msgConfigs;
            if (configs == null) {
                (target as any)._msgConfigs = configs = { autoListeners: [] };
                // 劫持onEnable，在其中激活监听函数
                let originOnEnable = (target as any).onEnable;
                (target as any).onEnable = function () {
                    configs.autoListeners.forEach((element: any) => {
                        Messager.addListener(element.msgClass, target[element.key], this);
                    });
                    if (originOnEnable) {
                        originOnEnable.call(this);
                    }
                };
                // 劫持onDisable，在其中移除监听函数
                let originOnDisable = (target as any).onDisable;
                (target as any).onDisable = function () {
                    configs.autoListeners.forEach((element: any) => {
                        Messager.removeListener(element.msgClass, target[element.key], this);
                    });
                    if (originOnDisable) {
                        originOnDisable.call(this);
                    }
                };
            }
            // 这里只登记，onEnable里集中注册
            configs.autoListeners.push({ msgClass, key });
        }
        else {
            Messager.addListener(msgClass, target[key], target);
        }
    };
}
// tslint:enable: no-invalid-this

/** 消息管理器 */
export default class Messager {
    private static msgQueue: Msg[] = [];
    private static listenerGroups: Listener[][] = [];

    /**
     * 添加消息监听函数
     * @param msgClass 消息原型
     * @param listener 监听函数
     * @param target 可选，监听者
     */
    public static addListener<MsgType extends Msg> (
        msgClass: { prototype: MsgType } & Function,
        listener: (msg: MsgType) => void,
        target?: any): Listener {
        if (typeof listener === 'function') {
            let msgid = msgClass.prototype._msgid;
            if (msgid == null) {
                msgClass.prototype._msgid = msgid = msgClassId++;
            }
            if (this.listenerGroups[msgid] == null) {
                this.listenerGroups[msgid] = [];
            }
            let ret = new Listener(msgClass, listener as any, target);
            this.listenerGroups[msgid].push(ret);
            return ret;
        }
        return null;
    }

    /** 移除消息监听函数 */
    public static removeListener<MsgType extends Msg> (
        msgClass: { prototype: MsgType } & Function,
        callback: (msg: MsgType) => void,
        target?: any
    ) {
        let msgid = msgClass.prototype._msgid;
        if (msgid == null) {
            return;
        }
        let listeners = this.listenerGroups[msgid];
        for (let index = listeners.length - 1; index >= 0; index--) {
            let listener = listeners[index];
            if (target === listener.target && listener.listener === callback) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 根据监听者移除监听函数
     * @param target 监听者
     */
    public static removeListenersByTarget (target: any) {
        for (let listeners of this.listenerGroups) {
            if (listeners == null) {
                continue;
            }
            for (let index = listeners.length - 1; index >= 0; index--) {
                let listener = listeners[index];
                if (target === listener.target) {
                    listeners.splice(index, 1);
                }
            }
        }
    }

    /**
     * 同步分发消息
     * @param msg 消息
     */
    public static dispatchMessage (msg: Msg) {
        if (msg == undefined) {
            return;
        }
        let msgid = (msg as any).__proto__.constructor.prototype._msgid;
        if (msgid == null) {
            console.error('msgid is null');
            return;
        }
        let listeners = this.listenerGroups[msgid];
        if (listeners == null) {
            return;
        }
        // 准备监听函数组，这么做是为防止监听函数内部修改this.listeners
        let validListeners: Listener[] = [];
        listeners.forEach((listener) => {
            validListeners.push(listener);
        });
        // 隔离执行
        validListeners.forEach((listener) => {
            try {
                listener.listener.call(listener.target, msg);
            }
            catch (err) {
                console.log(err);
            }
        });
    }

    /** 将消息入栈，调用栈清空后再行消息分发 */
    public static postMessage (msg: Msg) {
        Messager.msgQueue.push(msg);
        setTimeout(() => {
            let queue = Messager.msgQueue;
            Messager.msgQueue = [];
            queue.forEach((curMsg) => {
                Messager.dispatchMessage(curMsg);
            });
        }, 0);
    }
}

class Listener {
    public target: any;
    public msgClass: Function;
    public listener: (msg: Msg) => void;

    public constructor (msgClass: Function, listener: (msg: Msg) => void, target?: any) {
        this.msgClass = Function;
        this.listener = listener;
        this.target = target;
    }
}
