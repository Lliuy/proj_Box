/*******************************************************************************
文件: tdweapp.js
创建: 2020年07月03日
作者: 老张(zwx@xfire.mobi)
描述:
    使用ts改写的td小游戏统计sdk
*******************************************************************************/

'use strict';

let win: any = window;
let wxapi = (window as any).wx;
if (cc.sys.platform === cc.sys.WECHAT_GAME && wxapi != null) {
    win.tdInit = (_customConf: { appkey: string; appName: string; wxAppid: string }) => {
        let customConf = {
            config: {
                appkey: _customConf.appkey,
                appName: _customConf.appName,
                versionName: '1.0.0',
                versionCode: '1',
                wxAppid: _customConf.wxAppid,
                getLocation: false
            }
        };
        let _uidUrl = 'https://api.talkingdata.com/mpopenid';
        let _requestUrl = 'https://h5.udrig.com/app/wx/v1';
        let _uidKey = 'openId';
        let _version = ['1', '0', '4'];
        let waitFlag = {
            device: !0,
            network: !0,
            uid: !0
        };

        let appInfo = {
            sdk: {
                version: _version[0],
                minorVersion: _version[1],
                build: _version[2],
                platform: 'Weapp',
                partner: ''
            },
            app: {
                versionCode: customConf.config.versionCode || '1',
                versionName: customConf.config.versionName || '1.0.0',
                installTime: 0,
                displayName: customConf.config.appName,
                appKey: customConf.config.appkey,
                uniqueId: customConf.config.wxAppid,
                channel: ''
            },
            device: {
                type: 'mobile',
                softwareConfig: {},
                hardwareConfig: {},
                deviceId: { tid: undefined, uid: undefined }
            },
            networks: [{
                type: 'wifi',
                available: !1,
                connected: !1
            }, {
                type: 'cellular',
                available: !1,
                connected: !1,
                current: []
            }, {
                type: 'unknown',
                available: !1,
                connected: !1
            }
            ],
            locations: [{}
            ],
            appContext: {
                account: undefined,
                sessionId: undefined,
                sessionStartTime: undefined
            }
        };

        let Util = {
            firstInit: !1,
            initTime: 0,
            sessionId: '',
            sessionStartTime: 0,
            appLaunchInfo: null,
            sendFailTimes: 0,
            bakData: {},
            Store: {
                set(key, value) {
                    try {
                        wxapi.setStorageSync('TDSDK_' + key, value);
                    } catch (e) { }
                    Util.bakData['TDSDK_' + key] = value;
                },
                get(key: string) {
                    let value = null;
                    try {
                        value = wxapi.getStorageSync('TDSDK_' + key);
                    } catch (err) { }
                    if (value == null) {
                        value = Util.bakData['TDSDK_' + key];
                    }
                    return value;
                },
                remove(key) {
                    try {
                        wxapi.removeStorageSync('TDSDK_' + key);
                    } catch (e) { }
                    delete Util.bakData['TDSDK_' + key];
                }
            },
            random() {
                let str = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
                let len = str.length;
                let ret = '';
                for (let i = 0; i < 12; i++) {
                    ret += str.charAt(Math.floor(Math.random() * len));
                }
                return ret;
            },
            timestamp() {
                return Date.now();
            },
            deviceId() {
                return 'weapp-' + Util.timestamp() + '-' + Util.random();
            },
            getEventId(e) {
                if (!e && !/0{1}/.test(e)) {
                    return '';
                }
                let t = '';
                try {
                    t = e.toString();
                } catch (n) {
                    try {
                        t = JSON.stringify(e);
                    } catch (e) { }
                }
                return t.split(' ')[0].slice(0, 64);
            },
            addStoreData(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
                let t = 'EVENT_' + Util.sessionId;
                let n = Util.Store.get(t);
                n = n && n.length ? n.concat(e) : e;
                Util.Store.set(t, n);
                if (n.length >= 30) {
                    onLaunchFn.sessionContinue();
                    onLaunchFn.startLoop();
                }
            },
            eventHandle(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : '';
                let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
                if (e) {
                    let n: any = {
                        eventId: e,
                        count: 1,
                        startTime: Util.timestamp()
                    };
                    if ('WeappShare' === e) {
                        n.shareTickets = t.shareTickets;
                        let i: any = {};
                        i.user = Util.deviceId;
                        i.title = t.title;
                        i.desc = t.desc;
                        let a = t.path;
                        if (a) {
                            a = Util.getUrl('', Util.getSearchParams(t.path));
                            a = a.substring(1);
                        }
                        else {
                            console.log('分享事件的path参数缺少有效值');
                        }
                        i.path = a;
                        n.params = i;
                    }
                    Util.addStoreData([n]);
                }
            },
            getCacheData(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                let t = Object.keys(e);
                let n = [];
                let i = [];
                if (t.length) {
                    t.forEach((t) => {
                        let a = e[t];
                        if (a && a.sendFail && a.data) {
                            n = n.concat(a.data);
                            i.push(t);
                        }
                    });
                }
                return {
                    data: n,
                    keys: i
                };
            },
            sendCacheList: {},
            updateSendTime(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
                let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0;
                let n: any = appInfo.device.deviceId;
                let i = Util.Store.get('uid');
                let a = Util.Store.get('deviceId');
                e.forEach((o, s) => {
                    if (!o.device.deviceId.tid && !o.device.deviceId.uid) {
                        if (n.tid) {
                            o.device.deviceId.tid = n.tid;
                            if (n.uid) {
                                o.device.deviceId.uid = n.uid;
                                return !0;
                            }
                        }
                        else {
                            if (n.uid) {
                                o.device.deviceId.uid = n.uid;
                                o.device.deviceId.tid = n.uid;
                                return !0;
                            }
                            if (TDID.isWaitingForOpenid) {
                                if (i) {
                                    o.device.deviceId.uid = i;
                                    o.device.deviceId.tid = i;
                                    n.uid = i;
                                    n.tid = i;
                                    return !0;
                                }
                                if (a) {
                                    o.device.deviceId.tid = a;
                                    o.device.deviceId.uid = '';
                                }
                                else {
                                    let r = Util.deviceId();
                                    n.tid = r;
                                    n.uid = '';
                                    Util.Store.set('deviceId', r);
                                    o.device.deviceId.tid = r;
                                    o.device.deviceId.uid = '';
                                    TDID.shouldOverwriteTid = !1;
                                }
                            }
                            else {
                                o.device.deviceId.tid = n.tid;
                                o.device.deviceId.uid = n.uid;
                            }
                        }
                    }
                    if (o.action && o.action.data) {
                        e[s].action.data.start = t;
                    }
                });
                return e;
            },
            getRequestData(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
                let t = JSON.parse(JSON.stringify(e));
                let n = Util.sendCacheList;
                if (Object.keys(n).length) {
                    let i = Util.getCacheData(n);
                    t = t.concat(i.data);
                    i.keys.forEach((e) => {
                        return delete n[e];
                    });
                }
                let a = t.length;
                if (a) {
                    let o = [];
                    if (a >= 30) {
                        if (JSON.stringify(t).length > 61440) {
                            o.push(t.splice(0, a / 2));
                        }
                        o.push(t);
                    }
                    else {
                        o.push(t);
                    }
                    o.forEach((e) => {
                        let t = Util.timestamp();
                        n[t] = {
                            data: e,
                            sendFail: !1
                        };
                        let i = Util.updateSendTime(e, Util.timestamp());
                        Util.request(t, i);
                    });
                }
            },
            request(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0;
                let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : [];
                wxapi.request({
                    url: _requestUrl,
                    data: JSON.stringify(t),
                    method: 'POST',
                    success(t) {
                        if (t.statusCode !== 200) {
                            return;
                        }
                        delete Util.sendCacheList[e];
                        Util.sendFailTimes = 0;
                        if (!appHandle.appIsHide) {
                            clearTimeout(onLaunchFn.timeout);
                            onLaunchFn.timeout = null;
                            onLaunchFn.startLoop();
                        }
                    },
                    fail() {
                        if (appHandle.appIsHide) {
                            Util.Store.set('RESEND_' + e, t);
                            delete Util.sendCacheList[e];
                        }
                        else {
                            Util.sendCacheList[e].sendFail = !0;
                            if (Util.sendFailTimes < 5) {
                                Util.sendFailTimes++;
                            }
                        }
                    }
                });
            },

            getUrl(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : '';
                let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
                let n = Object.keys(t);
                let i = n.sort() || [];
                let a = i.length ? e + '?' : e;
                i.forEach((e, n) => {
                    if (0 !== n) {
                        (a += '&');
                    }
                    a += e + '=' + t[e];
                });
                return a;
            },
            getSearchParams(e) {
                if (!e) {
                    return {};
                }
                let t = {};
                e.split('&').forEach((e) => {
                    let n = e.split('=');
                    if (n.length === 2) {
                        t[n[0]] = n[1];
                    }
                });
                return t;
            }
        };
        let TDID = {
            shouldOverwriteTid: !0,
            isWaitingForOpenid: !0,
            isFirst: !0,
            init() {
                let e = TDID;
                let t = Util.Store.get('deviceId');
                let n = Util.Store.get('uid');
                if (n) {
                    let i = t || n;
                    e.setData(i, n);
                } else {
                    new Promise(TDID.getOpenid).then((n) => {
                        let i = void 0;
                        if (t) {
                            i = t;
                        }
                        else {
                            i = n;
                            Util.Store.set('deviceId', n);
                        }
                        e.setData(i, n);
                        Util.Store.set('uid', n);
                        TDID.isWaitingForOpenid = !1;
                    }).catch((n) => {
                        let i = void 0;
                        i = t || Util.deviceId();
                        e.setData(i, '');
                        if (TDID.shouldOverwriteTid) {
                            Util.Store.set('deviceId', i);
                        }
                        TDID.isWaitingForOpenid = !1;
                    });
                }
            },
            setData(e, t) {
                if (TDID.shouldOverwriteTid) {
                    appInfo.device.deviceId = {
                        tid: e,
                        uid: t
                    };
                }
                else {
                    appInfo.device.deviceId.uid = t;
                }
                waitFlag.uid = !1;
                onLaunchFn.getAppProfile();
            },
            getOpenid(e, t) {
                function n() {
                    if (i.isFirst) {
                        i.reGetOpenid(e, t);
                    }
                    else {
                        t('error');
                    }
                }
                let i = TDID;
                wxapi.login({
                    timeout: 3e3,
                    success(t) {
                        if (t.code) {
                            let i = _uidUrl;
                            wxapi.request({
                                url: i + '/' + customConf.config.appkey + '/' + t.code,
                                success(t) {
                                    let i = t.data;
                                    i && 200 === i.code && i[_uidKey] ? e(i[_uidKey]) : n();
                                },
                                fail(e) {
                                    n();
                                }
                            });
                        }
                        else {
                            n();
                        }
                    },
                    fail(e) {
                        n();
                    }
                });
            },
            reGetOpenid(e, t) {
                TDID.isFirst = !1;
                TDID.getOpenid(e, t);
            }
        };

        let request = {
            sendTime: 0,
            statusType(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                let t = [];
                let n = JSON.parse(JSON.stringify(appInfo));
                let i = {
                    domain: e.domain,
                    name: e.name,
                    data: e.data
                };
                n.ts = e.data.start || Util.timestamp();
                n.action = i;
                t.push(n);
                Util.getRequestData(t);
            },
            dataType(e?, t?) {
                let n = request.getStoreList(e, t);
                Util.getRequestData(n);
            },
            getEventType(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                if (e.pageEvent) {
                    return {
                        domain: 'page',
                        name: 'leave'
                    };
                }
                if (e.eventId) {
                    let t = e.eventId;
                    let n = {};
                    switch (t) {
                        case 'WeappShare':
                            n = {
                                domain: 'user',
                                name: 'share'
                            };
                            break;
                        case 'WeappPullDownRefresh':
                            n = {
                                domain: 'page',
                                name: 'pullDownRefresh'
                            };
                            break;
                        case 'WeappReachBottom':
                            n = {
                                domain: 'page',
                                name: 'reachBottom'
                            };
                            break;
                        default:
                            n = {
                                domain: 'appEvent',
                                name: ''
                            };
                    }
                    return n as any;
                }
            },
            getStoreList(e, t) {
                let n = request;
                let i = [];
                let a = e || Util.sessionId;
                let o = JSON.stringify(appInfo);
                let s = Util.Store.get('EVENT_' + a);
                if (s && s.length) {
                    s.forEach((e) => {
                        let a = n.getEventType(e);
                        let s = JSON.parse(o);
                        if (t && s.appContext) {
                            s.appContext.sessionStartTime = t;
                        }
                        let r = JSON.parse(JSON.stringify(e));
                        if (r.pageEvent) {
                            delete r.pageEvent;
                        }
                        r.status = 2;
                        let c = {
                            domain: a.domain,
                            name: a.name,
                            data: r
                        };
                        s.ts = r.startTime ? r.startTime : Util.timestamp();
                        s.action = c;
                        i.push(s);
                    });
                    Util.Store.remove('EVENT_' + a);
                }
                if (s && s.length) {
                    s.forEach((e) => {
                        let a = n.getEventType(e);
                        let s = JSON.parse(o);
                        if (t && s.appContext) {
                            (s.appContext.sessionStartTime = t);
                        }
                        let r = JSON.parse(JSON.stringify(e));
                        if (r.pageEvent) {
                            delete r.pageEvent;
                        }
                        r.status = 2;
                        let c = {
                            domain: a.domain,
                            name: a.name,
                            data: r
                        };
                        s.ts = r.startTime ? r.startTime : Util.timestamp();
                        s.action = c;
                        i.push(s);
                    });
                    Util.Store.remove('EVENT_' + a);
                }
                return i;
            }
        };

        let hasDataFlag = !1;
        let onLaunchFn = {
            timeout: null,
            launchOptions: undefined,
            init() {
                let e = wxapi.getLaunchOptionsSync();
                Util.appLaunchInfo = JSON.parse(JSON.stringify(e));
                Util.appLaunchInfo.scene = e.scene ? e.scene.toString() : '';
                TDID.init();
                onLaunchFn.judgeRequireData();
                onLaunchFn.getLocalParams();
                if (customConf.config.getLocation) {
                    onLaunchFn.getLocation();
                }
                onLaunchFn.getSystemInfo();
                onLaunchFn.getNetwork();
            },
            launchRequest() {
                let e = {
                    first: !0
                };
                request.statusType({
                    domain: 'app',
                    name: 'init',
                    data: e
                });
            },
            sessionStart(e?) {
                let t = Util.appLaunchInfo || {};
                let n = {
                    status: 1,
                    duration: 0,
                    name: t.path,
                    scene: t.scene,
                    query: t.query || {},
                    shareTicket: t.shareTicket,
                    referrerInfo: t.referrerInfo,
                    start: undefined,
                    url: undefined
                };
                if (e) {
                    onLaunchFn.setNewSession();
                }
                n.start = Util.Store.get('session_time') || Util.timestamp();
                n.url = Util.getUrl(n.name, n.query);
                request.statusType({
                    domain: 'session',
                    name: 'begin',
                    data: n
                });
            },
            sessionContinue() {
                request.dataType();
            },
            sessionEnd(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                let t = {
                    status: 3,
                    start: e.startTime,
                    duration: e.duration
                };
                request.statusType({
                    domain: 'session',
                    name: 'end',
                    data: t
                });
            },
            sendTmpSession() {
                onLaunchFn.sessionContinue();
                onLaunchFn.startLoop();
            },
            startLoop() {
                if (onLaunchFn.timeout) {
                    clearTimeout(onLaunchFn.timeout);
                    onLaunchFn.timeout = null;
                }
                let e = 3e3 * (Util.sendFailTimes + 1);
                onLaunchFn.timeout = setTimeout(() => {
                    onLaunchFn.sendTmpSession();
                }, e);
            },
            judgeRequireData() {
                if (!appInfo.app.appKey) {
                    appInfo.app.appKey = '';
                    console.error('请填写您在TalkingData申请的App ID');
                }
                if (!appInfo.app.displayName) {
                    appInfo.app.displayName = 'appname';
                    console.error('请填写您的小程序名称');
                }
            },
            getLocalParams() {
                let e = Util.Store.get('initTime');
                if (e) {
                    Util.initTime = e;
                }
                else {
                    Util.initTime = Util.timestamp();
                    Util.Store.set('initTime', Util.initTime);
                    Util.firstInit = !0;
                }
                appInfo.app.installTime = Util.initTime;
                let t = Util.appLaunchInfo.query || {};
                let n = t.TDChannelId ? t.TDChannelId : '';
                appInfo.app.channel = n;
                onLaunchFn.setNewSession();
            },
            setNewSession() {
                Util.sessionId = Util.deviceId();
                Util.sessionStartTime = Util.timestamp();
                Util.Store.set('session_time', Util.sessionStartTime);
                appInfo.appContext.sessionId = Util.sessionId;
                appInfo.appContext.sessionStartTime = Util.sessionStartTime;
            },
            getLaunchInfo() {
                let e = JSON.parse(JSON.stringify(onLaunchFn.launchOptions));
                e.type = 'appLaunch';
                return e;
            },
            getAppProfile() {
                if (!hasDataFlag) {
                    let e = ['device', 'network', 'uid'];
                    let t = !0;
                    e.forEach((e) => {
                        if (waitFlag[e]) {
                            t = !1;
                        }
                    });
                    if (t) {
                        hasDataFlag = !0;
                        onLaunchFn.startRequest();
                    }
                }
            },
            startRequest() {
                if (Util.firstInit) {
                    onLaunchFn.launchRequest();
                }
                onLaunchFn.sessionStart();
                onLaunchFn.startLoop();
            },
            getLocation() {
                wxapi.getLocation({
                    type: 'wgs84',
                    complete(e) {
                        if (e.longitude || e.latitude || e.horizontalAccuracy || e.verticalAccuracy) {
                            let t: any = appInfo.locations[0];
                            t.lng = e.longitude;
                            t.lat = e.latitude;
                            t.hAccuracy = e.horizontalAccuracy;
                            t.vAccuracy = e.verticalAccuracy;
                            t.speed = e.speed;
                            t.altitude = e.altitude;
                            t.ts = Date.now();
                        }
                    }
                });
            },
            getNetwork() {
                wxapi.getNetworkType({
                    complete(e) {
                        let t = appInfo.networks;
                        let n = e.networkType;
                        if (n === 'wifi') {
                            t[0].available = !0;
                            t[0].connected = !0;
                        }
                        else {
                            if (n === 'unknown') {
                                t[2].available = !0;
                                t[2].connected = !0;
                            }
                            else {
                                if (n !== 'none') {
                                    t[1].available = !0;
                                    t[1].connected = !0;
                                    t[1].current.push({
                                        type: n
                                    });
                                }
                            }
                        }
                        waitFlag.network = !1;
                        onLaunchFn.getAppProfile();
                    }
                });
            },
            getSystemInfo() {
                wxapi.getSystemInfo({
                    complete(e) {
                        if (e.model || e.system || e.SDKVersion) {
                            let t = {
                                model: e.model,
                                pixel: e.screenWidth + '*' + e.screenHeight + '*' + e.pixelRatio,
                                densityDpi: e.pixelRatio,
                                brand: e.brand
                            };
                            let n = {
                                os: e.system,
                                local: e.language,
                                language: 'zh_CN',
                                osVersionCode: e.version,
                                timezone: - (new Date()).getTimezoneOffset() / 60,
                                mpVersion: e.SDKVersion
                            };
                            appInfo.device.hardwareConfig = t;
                            appInfo.device.softwareConfig = n;
                        }
                        waitFlag.device = !1;
                        onLaunchFn.getAppProfile();
                    }
                });
            }
        };

        let eventHandle = {
            event() {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                let t = Util.getEventId(e.id);
                if (t) {
                    let n: any = {};
                    n.eventId = t;
                    n.label = Util.getEventId(e.label);
                    n.count = e.count || 1;
                    n.params = e.params;
                    n.startTime = Util.timestamp();
                    Util.addStoreData([n]);
                }
            },
            share() {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                Util.eventHandle('WeappShare', e);
            },
            pullDownRefresh() {
                Util.eventHandle('WeappPullDownRefresh');
            },
            reachBottom() {
                Util.eventHandle('WeappReachBottom');
            },
            setAccount(...args) {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                if (e.accountId || /0{1}/.test(e.accountId)) {
                    appInfo.appContext.account = e;
                }
                else {
                    void console.warn('accountId为必填字段！');
                }
            }
        };

        let appHandle = {
            isHide2Show: !1,
            appIsHide: !1,
            show() {
                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                appHandle.appIsHide = !1;
                appHandle.getlastTmpData();
                if (appHandle.isHide2Show) {
                    let t = Util.Store.get('TMP_time_end_' + Util.sessionId);
                    let n = e.scene ? e.scene.toString() : '';
                    if (e.scene && n === Util.appLaunchInfo.scene) {
                        Util.timestamp() - t > 3e4 ? appHandle.sessionRestart(t) : Util.Store.remove('TMP_time_end_' + Util.sessionId);
                    }
                    else {
                        Util.appLaunchInfo = JSON.parse(JSON.stringify(e));
                        Util.appLaunchInfo.scene = n;
                        appHandle.sessionRestart(t);
                    }
                    appHandle.isHide2Show = !1;
                    onLaunchFn.startLoop();
                }
            },
            sessionRestart(e) {
                let t = Util.Store.get('TMP_time_start_' + Util.sessionId);
                let n = {
                    startTime: t,
                    duration: parseInt(((e - t) / 1e3).toString(), 10)
                };
                onLaunchFn.sessionEnd(n);
                Util.Store.remove('TMP_time_start_' + Util.sessionId);
                Util.Store.remove('TMP_time_end_' + Util.sessionId);
                Util.Store.remove('session_time');
                onLaunchFn.sessionStart(!0);
            },
            hide() {
                appHandle.appIsHide = !0;
                clearTimeout(onLaunchFn.timeout);
                onLaunchFn.timeout = null;
                onLaunchFn.sessionContinue();
                appHandle.isHide2Show = !0;
                Util.Store.set('TMP_time_start_' + Util.sessionId, Util.Store.get('session_time'));
                Util.Store.set('TMP_time_end_' + Util.sessionId, Util.timestamp());
            },
            getlastTmpData() {
                let e = [];
                let t = wxapi.getStorageInfoSync().keys || [];
                let n = void 0;
                let i = void 0;
                if (t && t.length) {
                    n = t.filter((e) => {
                        return e.indexOf('TDSDK_EVENT') > -1;
                    });
                    i = t.filter((e) => {
                        return e.indexOf('TDSDK_RESEND') > -1;
                    });
                }
                if (n && n.length) {
                    n.forEach((t) => {
                        let n: any = {};
                        n.id = t.split('_')[2];
                        n.time = n.id.split('-')[1];
                        e.push(n);
                    });
                    appHandle.sendLastTmpData(e);
                }

                if (i && i.length) {
                    i.forEach((e) => {
                        wxapi.getStorage({
                            key: e,
                            success: (t) => {
                                Util.getRequestData(t.data);
                                wxapi.removeStorage({
                                    key: e,
                                    success: (e) => { }
                                });
                            }
                        });
                    });
                }

            },
            sendLastTmpData(...args) {
                (arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : []).forEach((e) => {
                    request.dataType(e.id, e.time);
                });
            }
        };

        if ((window as any).GameGlobal) {
            (window as any).GameGlobal.tdAppSdk = eventHandle;
        }
        onLaunchFn.init();
        wxapi.onShow(appHandle.show);
        wxapi.onHide(appHandle.hide);
    };
}
