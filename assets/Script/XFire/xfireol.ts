/**
 * 杭州炫火科技有限公司
 * 小程序弱联网接口
 */
import xfire from './xfire';
import { AppConfig, XUserInfoWithSignature } from './xfire_base';
const Configs = {
    服务端地址: 'https://minigame.orbn.top/minigame/json'
    // 服务端地址: 'http://192.168.1.98/MiniGame/json'
};
if (false) {
    Configs.服务端地址 = 'http://127.0.0.1/MiniGame/json';
}

const GUEST_ID = '__xfireol_guest_id';

interface OnlineUserInfo{
    id: number;
    nickname: string;
    avatar: string;
    session: string;
    guest: boolean;
    noname: boolean;
}

export class XFireOnline{
    public id = 0;
    public nickname = '';
    public avatar = '';
    public noname = true;       // 标记是否已设置昵称
    public guest = true;        // 标记是否为游客

    private session: string = null;
    private userinfo: OnlineUserInfo = null;

    public supportLogin(): boolean {
        return xfire.supportLogin() || xfire.allowGuest();
    }

    public isLogined(): boolean {
        return this.session != null && this.session !== '';
    }

    public getUserInfo(): OnlineUserInfo {
        return this.userinfo || {id: 0, nickname: '', avatar: '', session: this.session, noname: true, guest: true};
    }

    /**
     * 登录到弱联网服务器
     * @param onSuccess 成功回调
     * @param onFail 失败回调
     */
    public login(params?: {
        success?: (userInfo: OnlineUserInfo) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        userInfo?: OnlineUserInfo;
        error?: string;
    }> {
        return new Promise<{
            userInfo?: OnlineUserInfo;
            error?: string;
        }> ((resolve) => {
            let err = null;
            let lParams = params || {};
            let appConfig = xfire.getAppConfig();
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            if (!xfire.supportLogin() && !xfire.allowGuest()) {
                err = '平台不支持登录';
            }
            else if (appConfig == null) {
                err = 'appConfig未初始化';
            }
            else if (appConfig.appid == null || appConfig.appid === '') {
                err = 'xhappcfg中未配置appid';
            }
            if (err != null) {
                callFail(err);
                return;
            }

            let doLogin = (params) => {
                this.request('login', params, (data: any) => {
                    if (data && data.result === 'ok') {
                        if (data.data && data.data.guest) {
                            cc.sys.localStorage.setItem(GUEST_ID, data.data.guestId);
                        }
                        this.updateUserInfo(data.data);
                        if (lParams.success) {
                            lParams.success(data.data);
                        }
                        if (lParams.complete) {
                            lParams.complete();
                        }
                        resolve({userInfo: data.data});
                    }
                    else {
                        callFail(data.msg);
                    }
                });
            };

            xfire.login({
                success: (res) => {
                    res.appid = appConfig.appid;
                    let params: any = {};
                    params.plat = xfire.plat;
                    params.appid = appConfig.appid;
                    params.channel = appConfig.channel;
                    params.userid = res.userid;
                    params.code = res.code;
                    params.sharer = 0;
                    params.signature = res.signature;
                    params.token = res.token;
                    params.account = res.account;
                    params.session = res.session;
                    params.version = appConfig.version || '';
                    params.nickname = res.nickname;
                    params.avatar = res.avatar;
                    params.username = res.username;
                    params.password = res.password;
                    params.platform = res.platform;
                    params.ticket = res.ticket;
                    params.guestId = cc.sys.localStorage.getItem(GUEST_ID);

                    doLogin(params);
                },
                fail: (err) => {
                    if (xfire.allowGuest()) {
                        let params: any = {};
                        params.plat = xfire.plat;
                        params.appid = appConfig.appid;
                        params.channel = appConfig.channel;
                        params.version = appConfig.version || '';
                        params.loginAsGuest = true; // 游客登录标记
                        params.guestId = cc.sys.localStorage.getItem(GUEST_ID);
                        doLogin(params);
                    }
                    else {
                        callFail(JSON.stringify(err));
                    }
                }
            });
        });
    }

    /**
     * 以游客身份登录
     */
    public loginAsGuest(params?: {
        success?: (userInfo: OnlineUserInfo) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        userInfo?: OnlineUserInfo;
        error?: string;
    }> {
        return new Promise<{
            userInfo?: OnlineUserInfo;
            error?: string;
        }> ((resolve) => {
            let err = null;
            let lParams = params || {};
            let appConfig = xfire.getAppConfig();
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let doLogin = (params) => {
                this.request('login', params, (data: any) => {
                    if (data && data.result === 'ok') {
                        if (data.data && data.data.guest) {
                            cc.sys.localStorage.setItem(GUEST_ID, data.data.guestId);
                        }
                        this.updateUserInfo(data.data);
                        if (lParams.success) {
                            lParams.success(data.data);
                        }
                        if (lParams.complete) {
                            lParams.complete();
                        }
                        resolve({userInfo: data.data});
                    }
                    else {
                        callFail(data.msg);
                    }
                });
            };
            {
                let params: any = {};
                params.plat = xfire.plat;
                params.appid = appConfig.appid;
                params.channel = appConfig.channel;
                params.version = appConfig.version || '';
                params.loginAsGuest = true;
                params.guestId = cc.sys.localStorage.getItem(GUEST_ID);
                doLogin(params);
            }
        });
    }

    public setUserData(params?: string | {
        content: string;
        success?: () => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        success?: boolean;
        error?: string;
    }> {
        let lParams = (params || {}) as {
            content?: string;
            success?: () => void;
            fail?: (err: string) => void;
            complete?: () => void;
        };
        if (typeof params === 'string') {
            lParams = {content: params};
        }
        return new Promise<{
            success?: boolean;
            error?: string;
        }> ((resolve) => {
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };

            if (!this.isLogined()) {
                return callFail('尚未登录');
            }
            if (lParams == null || lParams.content == null) {
                return callFail('数据不能为null');
            }
            this.request('setUserData', {content: lParams.content}, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success();
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({success: true});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    public getUserData(params?: {
        success?: (data: string) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: string;
        error?: string;
    }> {
        return new Promise<{
            data?: string;
            error?: string;
        }> ((resolve) => {
            let lParams = params || {};
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };

            if (!this.isLogined()) {
                return callFail('尚未登录');
            }
            this.request('getUserData', null, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success(data.data.content);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({data: data.data.content});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    /**
     * 向服务器提交用户信息
     * @param params 参数集合
     * userInfo：使用getUserInfo获取或者信息按钮获取
     */
    public submitUserInfo(params: XUserInfoWithSignature | {
        userInfo: XUserInfoWithSignature;
        success?: (userInfo: OnlineUserInfo) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        userInfo?: OnlineUserInfo;
        error?: string;
    }> {
        return new Promise<{
            userInfo?: OnlineUserInfo;
            error?: string;
        }>((resolve) => {
            let lParams = (params || {}) as {
                userInfo: XUserInfoWithSignature;
                success?: (userInfo: OnlineUserInfo) => void;
                fail?: (err: string) => void;
                complete?: () => void;
            };
            if (params instanceof XUserInfoWithSignature) {
                lParams = {userInfo: params};
            }
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };

            if (!this.isLogined()) {
                return callFail('尚未登录');
            }
            if (lParams == null || lParams.userInfo == null) {
                return callFail('数据不能为null');
            }
            this.request('submitUserInfo', lParams.userInfo, (data) => {
                if (data.result === 'ok') {
                    this.updateUserInfo(data.data);
                    if (lParams.success) {
                        lParams.success(data.data);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({userInfo: data.data});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    /**
     * 获取服务器时间，无需登录
     */
    public getServerTime(params?: {
        success?: (serverTime: {year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number; timezone: number; timestamp: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        serverTime?: {year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number; timezone: number; timestamp: number};
        error?: string;
    }> {
        return new Promise<{
            serverTime?: {year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number; timezone: number; timestamp: number};
            error?: string;
        }> ((resolve) => {
            let lParams = params || {};
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let appConfig = this.checkAppConfig();
            if (typeof appConfig === 'string') {
                callFail(appConfig as string);
                return;
            }
            this.request('getServerTime', null, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success(data.data);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({serverTime: data.data});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    /**
     * 从服务器获取配置，无需登录
     */
    public getConfigs(params?: {
        success?: (configs: {[key: string]: any}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        configs?: {[key: string]: any};
        error?: string;
    }> {
        return new Promise<{
            configs?: {[key: string]: any};
            error?: string;
        }> ((resolve) => {
            let lParams = params || {};
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let appConfig = this.checkAppConfig();
            if (typeof appConfig === 'string') {
                callFail(appConfig as string);
                return;
            }
            this.request('getConfigs', {appid: appConfig.appid, plat: xfire.plat, sdk: xfire.getAdSdkName(), channel: appConfig.channel, version: appConfig.version}, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success(data.data);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({configs: data.data});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    /**
     * 上传全局榜单
     * @param params 参数集合
     *      replace: 是否强制替换分数，而不管原先的分数高低
     * score：[1, 999999998]
     */
    public uploadGlobalScore(params: {
        score: number;
        replace?: boolean;
        success?: (data: {type: string; score: number; newRecord: boolean; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number};
        error?: string;
    }> {
        return this.uploadScore({
            type: 'global',
            score: params.score,
            replace: params.replace,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 上传关卡分数，永久保存
     * @param params 参数集合
     *      lv：[1, 9999]
     *      replace: 是否强制替换分数，而不管原先的分数高低
     * score：[1, 999999998]
     */
    public uploadLevelScore(params: {
            lv: number;
            score: number;
            replace?: boolean;
            success?: (data: {type: string; lv: number; score: number; newRecord: boolean; rank: number; count: number}) => void;
            fail?: (err: string) => void;
            complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number};
        error?: string;
    }> {
        return this.uploadScore({
            type: 'level',
            lv: params.lv,
            score: params.score,
            replace: params.replace,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 上传关卡分数，日清
     * @param params 参数集合
     *      lv：[1, 9999]
     *      replace: 是否强制替换分数，而不管原先的分数高低
     * score：[1, 999999998]
     */
    public uploadDailyLevelScore(params: {
        lv: number;
        score: number;
        replace?: boolean;
        success?: (data: {type: string; lv: number; score: number; newRecord: boolean; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number};
        error?: string;
    }> {
        return this.uploadScore({
            type: 'daily',
            lv: params.lv,
            score: params.score,
            replace: params.replace,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 上传关卡分数，周清
     * @param params 参数集合
     *      lv：[1, 9999]
     *      score：[1, 999999998]
     *      replace: 是否强制替换分数，而不管原先的分数高低
     */
    public uploadWeeklyLevelScore(params: {
        lv: number;
        score: number;
        replace?: boolean;
        success?: (data: {type: string; lv: number; score: number; newRecord: boolean; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number};
        error?: string;
    }> {
        return this.uploadScore({
            type: 'weekly',
            lv: params.lv,
            score: params.score,
            replace: params.replace,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 上传关卡分数，月清
     * @param params 参数集合
     *      lv：[1, 9999]
     *      score：[1, 999999998]
     *      replace: 是否强制替换分数，而不管原先的分数高低
     */
    public uploadMonthlyLevelScore(params: {
        lv: number;
        score: number;
        replace?: boolean;
        success?: (data: {type: string; lv: number; score: number; newRecord: boolean; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number};
        error?: string;
    }> {
        return this.uploadScore({
            type: 'monthly',
            lv: params.lv,
            score: params.score,
            replace: params.replace,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 全局榜单分数评估
     * @param params 参数集合
     * score：[1, 999999998]
     */
    public evaluateGlobalScore(params: {
        score: number;
        success?: (data: {type: string; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.evaluateScore({
            type: 'global',
            score: params.score,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 关卡分数评估
     * @param params 参数集合
     * lv：[1, 9999]
     * score：[1, 999999998]
     */
    public evaluateLevelScore(params: {
            lv: number;
            score: number;
            success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
            fail?: (err: string) => void;
            complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.evaluateScore({
            type: 'level',
            lv: params.lv,
            score: params.score,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 日榜分数评估
     * @param params 参数集合
     * lv：[1, 9999]
     * score：[1, 999999998]
     */
    public evaluateDailyLevelScore(params: {
        lv: number;
        score: number;
        success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.evaluateScore({
            type: 'daily',
            lv: params.lv,
            score: params.score,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 周榜分数评估
     * @param params 参数集合
     * lv：[1, 9999]
     * score：[1, 999999998]
     */
    public evaluateWeeklyLevelScore(params: {
        lv: number;
        score: number;
        success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.evaluateScore({
            type: 'weekly',
            lv: params.lv,
            score: params.score,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 月榜分数评估
     * @param params 参数集合
     * lv：[1, 9999]
     * score：[1, 999999998]
     */
    public evaluateMonthlyLevelScore(params: {
        lv: number;
        score: number;
        success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.evaluateScore({
            type: 'monthly',
            lv: params.lv,
            score: params.score,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getGlobalScore(params: {
        success?: (data: {type: string; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.getScore({
            type: 'global',
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getLevelScore(params: {
        lv: number;
        success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.getScore({
            type: 'level',
            lv: params.lv,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getDailyLevelScore(params: {
        lv: number;
        last?: boolean;
        success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.getScore({
            type: params.last === true ? 'lastdaily' : 'daily',
            lv: params.lv,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getWeeklyLevelScore(params: {
        lv: number;
        last?: boolean;
        success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.getScore({
            type: params.last === true ? 'lastweekly' : 'weekly',
            lv: params.lv,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getMonthlyLevelScore(params: {
        lv: number;
        last?: boolean;
        success?: (data: {type: string; lv: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return this.getScore({
            type: params.last === true ? 'lastmonthly' : 'monthly',
            lv: params.lv,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 获取全局榜单
     * @param params start表从哪个排名开始取，默认1
     */
    public getGlobalRanklist(params: {
        start?: number;
        count?: number;
        success?: (data: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}};
        error?: string;
    }> {
        return this.getRanklist({
            type: 'global',
            start: params.start,
            count: params.count,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 获取全局榜单
     * @param params start表从哪个排名开始取，默认1
     */
    public getLevelRanklist(params: {
        lv: number;
        start?: number;
        count?: number;
        success?: (data: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}};
        error?: string;
    }> {
        return this.getRanklist({
            type: 'level',
            start: params.start,
            lv: params.lv,
            count: params.count,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getDailyLevelRanklist(params: {
        lv: number;
        last?: boolean;
        start?: number;
        count?: number;
        success?: (data: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}};
        error?: string;
    }> {
        return this.getRanklist({
            type: params.last === true ? 'lastdaily' : 'daily',
            start: params.start,
            lv: params.lv,
            count: params.count,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getWeeklyLevelRanklist(params: {
        lv: number;
        last?: boolean;
        start?: number;
        count?: number;
        success?: (data: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}};
        error?: string;
    }> {
        return this.getRanklist({
            type: params.last === true ? 'lastweekly' : 'weekly',
            start: params.start,
            lv: params.lv,
            count: params.count,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    public getMonthlyLevelRanklist(params: {
        lv: number;
        last?: boolean;
        start?: number;
        count?: number;
        success?: (data: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}};
        error?: string;
    }> {
        return this.getRanklist({
            type: params.last === true ? 'lastmonthly' : 'monthly',
            start: params.start,
            lv: params.lv,
            count: params.count,
            success: params.success,
            fail: params.fail,
            complete: params.complete
        });
    }

    /**
     * 提现，qq提现需要在xhappcfg.json的qq配置里添加withdraw参数，如
     * iconid和bannerid是红包呈现的外观模板，用户在qq里领取红包会展示给用户，需要在商户后台上传配置
     * "withdraw":{"actName": "活动名", "wishing": "祝福语", "iconId": "iconid", "bannerId": "bannerid"}
     * @param cash 提现金额，单位元
     */
    public withdraw(params: {
        cash: number;
        success?: () => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        success?: boolean;
        error?: string;
    }>  {
        return new Promise<{
            success?: boolean;
            error?: string;
        }> ((resolve) => {
            let lParams = params;
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let appConfig = this.checkAppConfig();
            if (typeof appConfig === 'string') {
                callFail(appConfig as string);
                return;
            }
            this.request('withdraw', {cash: Math.floor(lParams.cash * 100), ext: xfire.getSdkConfig() && xfire.getSdkConfig().withdraw}, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success();
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({success: true});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    private getRanklist(params: {
        type: string;
        lv?: number;
        start?: number;
        count?: number;
        success?: (data: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}};
        error?: string;
    }> {
        return new Promise<{
            data?: {ranklist: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}[]; self: {id: number; nickname: string; avatar: string; gender: string; rank: number; score: number}};
            error?: string;
        }>((resolve) => {
            let lParams = params;
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let appConfig = this.checkAppConfig();
            if (typeof appConfig === 'string') {
                callFail(appConfig as string);
                return;
            }
            this.request('getRanklist', {type: params.type, lv: params.lv, start: params.start, count: params.count}, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success(data.data);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({data: data.data});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    private getScore(params: {
        type: string;
        lv?: number;
        success?: (data: {type: string; lv?: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return new Promise<{
            data?: {type: string; lv?: number; score: number; rank: number; count: number};
            error?: string;
        }>((resolve) => {
            let lParams = params;
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let appConfig = this.checkAppConfig();
            if (typeof appConfig === 'string') {
                callFail(appConfig as string);
                return;
            }
            this.request('getScore', {type: params.type, lv: params.lv}, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success(data.data);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({data: data.data});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    private uploadScore(params: {
        type: string;
        replace?: boolean;
        lv?: number;
        score: number;
        success?: (data: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number};
        error?: string;
    }> {
        return new Promise<{
            data?: {type: string; lv?: number; score: number; newRecord: boolean; rank: number; count: number};
            error?: string;
        }>((resolve) => {
            let lParams = params;
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let appConfig = this.checkAppConfig();
            if (typeof appConfig === 'string') {
                callFail(appConfig as string);
                return;
            }
            if (params.score === 0) {
                console.warn('上传0分将被服务器忽略');
            }
            this.request('uploadScore', {type: params.type, lv: params.lv, score: params.score, replace: params.replace}, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success(data.data);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({data: data.data});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    private evaluateScore(params: {
        type: string;
        lv?: number;
        score: number;
        success?: (data: {type: string; lv?: number; score: number; rank: number; count: number}) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        data?: {type: string; lv?: number; score: number; rank: number; count: number};
        error?: string;
    }> {
        return new Promise<{
            data?: {type: string; lv?: number; score: number; rank: number; count: number};
            error?: string;
        }>((resolve) => {
            let lParams = params;
            let callFail = (err: string) => {
                console.log(err);
                if (lParams.fail) {
                    lParams.fail(err || '未知错误');
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({error: err || '未知错误'});
            };
            let appConfig = this.checkAppConfig();
            if (typeof appConfig === 'string') {
                callFail(appConfig as string);
                return;
            }
            this.request('evaluateScore', {type: params.type, lv: params.lv, score: params.score}, (data) => {
                if (data.result === 'ok') {
                    if (lParams.success) {
                        lParams.success(data.data);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({data: data.data});
                }
                else {
                    callFail(data.msg);
                }
            });
        });
    }

    private checkAppConfig(): AppConfig | string {
        let appConfig = xfire.getAppConfig();
        let err = null;
        if (appConfig == null) {
            err = 'appConfig未初始化';
        }
        else if (appConfig.appid == null || appConfig.appid === '') {
            err = 'xhappcfg中未配置appid';
        }
        if (err != null) {
            return err;
        }
        return appConfig;
    }

    private request(method: string, data: any, onResult: (data: {result: string; msg?: string; data?: any}) => void = null) {
        let req: any = {};
        req.session = this.session; // 放在消息外 作为通信层信息
        req.method = method;
        req.data = data;
        let strBody = xfire.encrypt(JSON.stringify(req), 'spj88' + 'frfub3' + 'ryalu');
        xfire.httpGetStringWithBody(Configs.服务端地址, strBody).then((ret) => {
            if (typeof ret.content !== 'string') {
                let err = '通信返回数据类型不对，错误：' + ret.error + ' method:' + method;
                if (onResult) {
                    onResult({result: 'fail', msg: err});
                }
                return;
            }
            let cnt = ret.content;
            let json: any = null;
            try {
                if (cnt.indexOf('{') === -1) {
                    cnt = xfire.decrypt(cnt, 'spj88' + 'frfub3' + 'ryalu');
                }
                json = JSON.parse(cnt);
            } catch (error) {
                if (onResult) {
                    onResult({result: 'fail', msg: JSON.stringify(error)});
                }
                return;
            }
            if (onResult) {
                onResult(json);
            }
        });
    }

    private updateUserInfo(info: OnlineUserInfo) {
        if (info == null) {
            return;
        }
        if (info.session != null && info.session !== '') {
            this.session = info.session;
        }
        this.id = (info.id == null || info.id <= 0) ? 0 : info.id;
        xfire.userid = this.id.toString();
        xfire.userSession = this.session;
        this.nickname = info.nickname || '';
        this.avatar = info.avatar || '';
        this.guest = info.guest === true;
        this.noname = info.noname === true;
    }

}

let inst = new XFireOnline();
(window as any).xfireol = inst;

export default inst;
