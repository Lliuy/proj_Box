/*******************************************************************************
文件: XFSM.ts
创建: 2021年04月15日
作者: 老张(zwx@xfire.mobi)
描述:
    TypeScript实现状态机

参考：
    https://github.com/eonarheim/TypeState
    https://github.com/eram/ts-fsm
*******************************************************************************/

type AnyState = null;

export class XFSMAction {
    public name: string;
    public fromStates: string[];
    public toState: string;

    public constructor(name: string, from: string | string[], _to?: string) {
        let to = _to || '';
        this.name = name;
        if (from == null) {
            this.fromStates = [];
        }
        else if (typeof from === 'string') {
            this.fromStates = [from as string];
        }
        else {
            this.fromStates = from as string[];
        }
        this.toState = to;
    }
}

class XFSMTransitionFunction {
    public action: string;
    public from: string;
    public to: string;
    public constructor(action: string, from: string, to: string) {
        this.action = action;
        this.from = from;
        this.to = to;
    }
}

export default class XFSM {
    public state = '';
    private startState = '';
    private transitionFunctions: XFSMTransitionFunction[] = [];
    private onCallbacks: { [key: string]: (from: string, action: string | null) => void } = {};
    /** 进入某个状态的回调 */
    private onEnterCallbacks: { [key: string]: (from: string, to: string, action: string, ...args: any[]) => void } = {};
    /** 离开某个状态的回调 */
    private onLeaveCallbacks: { [key: string]: (from: string, to: string, action: string) => void } = {};
    /** 完成某个动作的回调 */
    private onAfterActionCallbacks: { [key: string]: (from: string, to: string, action: string, ...args: any[]) => void } = {};
    /** 逻辑刷新 */
    private onUpdateCallbacks: { [key: string]: (dt: number) => void } = {};

    public constructor(startState: string) {
        this.state = startState;
        this.startState = startState;
    }

    /** 启动、复位 */
    public reset() {
        this.state = this.startState;

        let enterCallback = this.onEnterCallbacks[this.state];
        if (enterCallback != null) {
            enterCallback('', this.state, '');
        }
    }

    /** 添加动作 */
    public addAction(action: XFSMAction) {
        if (action.name == null || action.name === '') {
            console.error('Invalid action name.');
            return;
        }
        action.fromStates.forEach((from) => {
            this.transitionFunctions.push(new XFSMTransitionFunction(action.name, from, action.toState));
        });
    }

    /** 执行动作 */
    public runAction(action: string, ...args: any[]) {
        for (let fun of this.transitionFunctions) {
            if (fun.action === action && (fun.from === this.state || fun.from === '*')) {
                let from = this.state;
                this.transitionTo(fun.to, action, ...args);
                if (this.onAfterActionCallbacks[action]) {
                    this.onAfterActionCallbacks[action](from, this.state, action, ...args);
                }
                return;
            }
        }
        // console.warn(`Action ${action} not runnable.`);
    }

    /** 判断某个动作是否可执行 */
    public canRunAction(action: string): boolean {
        for (let fun of this.transitionFunctions) {
            if (fun.action === action && (fun.from === this.state || fun.from === '*')) {
                return true;
            }
        }
        return false;
    }

    /** 额外添加一个动作是否可执行的判定 */
    public checkRunnable(action: string, checker: () => boolean) {
    }

    /** 额外添加一个状态是否可入的判定 */
    public checkEnterable(state: string, checker: () => boolean) {
    }

    /** 进入某个状态的回调 */
    public onEnter(state: string, callback: (from: string, to: string, action: string | null, ...args: any[]) => void): XFSM {
        this.onEnterCallbacks[state] = callback;
        return this;
    }

    /** 离开某个状态的回调 */
    public onLeave(state: string, callback: (from: string, to: string, action: string) => void): XFSM {
        this.onLeaveCallbacks[state] = callback;
        return this;
    }

    /** 执行某个动作后的回调，用例：不需要修改状态的动作，动作本身的操作 */
    public onAfterAction(action: string, callback: (from: string, to: string, action: string, ...args: any[]) => void): XFSM {
        this.onAfterActionCallbacks[action] = callback;
        return this;
    }

    public onUpdate(state: string, callback: (dt: number) => void) {
        this.onUpdateCallbacks[state] = callback;
        return this;
    }

    public is(state: string): boolean {
        return this.state === state;
    }

    public update(dt: number) {
        let cb = this.onUpdateCallbacks[this.state];
        if (cb != null) {
            cb(dt);
        }
    }

    private transitionTo(state: string, action: string, ...args: any) {
        if (!state || state === '') return;
        let exitCallback = this.onLeaveCallbacks[this.state];
        if (exitCallback != null) {
            exitCallback(this.state, state, action);
        }

        let from = this.state;
        this.state = state;

        let enterCallback = this.onEnterCallbacks[state];
        if (enterCallback != null) {
            enterCallback(from, state, action, ...args);
        }
    }
}
