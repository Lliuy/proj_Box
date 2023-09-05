/*******************************************************************************
文件: XAudio.ts
创建: 2020年04月07日
作者: 老张(zwx@xfire.mobi)
描述:
    音频管理接口
    属性：
        soundOn         音效开关
        musicOn         音乐开关
        musicPlaying    播放中音频名，无关是否静音
    方法：
        addAudio        手动添加音频
        addResAudios    批量加载resource目录下的音频
        addRemoteAudio  添加远程音频
        removeAudio     移除音频
        getAudio        获取音频
        playSound       播放音效，默认有0.05秒的间隔限制
        playMusic       播放音乐
        pauseMusic      暂停音乐
        resumeMusic     恢复音乐
        stopMusic       停止音乐，musicPlaying清空
    以下测试已正常：
        音乐开(无声)->播放音乐(有声)->音乐关(无声)->音乐开(有声)
        音乐开(无声)->播放音乐(有声)->音乐关(无声)->暂停(无声)->音乐开(无声)->恢复(有声)

注意：
    静音开关与播放接口在使用中是可以保持独立的逻辑的，
    播放时不需要考虑静音开关，反过来，设置静音开关时也不需要考虑播放接口
    在游戏设计需要的地方调用playMusic、playSound就行，不用判断是否静音

范例：
    用户点击封面的声音开关：
    onclickSoundSwitch() {
        XAudio.musicOn = !XAudio.musicOn;
        XAudio.soundOn = !XAudio.soundOn;
        this.labelMusicSwitch.string = XAudio.musicOn ? '音乐开' : '音乐关';
        // 不需要再根据控制结果调用 playMusic、stopMusic
    }
*******************************************************************************/

const AudioDoc = '__xfire_audio_doc'; // 自动存档名

enum RealState{
    Playing,
    Paused,
    Stopped
}

export default class XAudio{
    public static autoSave = true;
    // 音效播放的间隔限制，单位：秒
    public static soundInterval = 0.05;
    private static soundState: boolean = null;
    private static musicState: boolean = null;
    private static vibrateState: boolean = null;
    private static audioClips: {[key: string]: cc.AudioClip} = {};
    // 待播放的音乐，用于解决调用了playMusic但音乐还未加载的情况
    private static musicToPlay: string = null;
    // 正在播放中的音乐 不受音乐、音效开关影响
    private static musicPlaying: string = null;
    // 逻辑上是否暂停
    private static musicPaused = false;
    // 音频实际状态
    private static realState = RealState.Stopped;

    // 某个音效最近一次播放时间，用于同时刻音效并发控制
    private static justPlayedSounds: {[key: string]: number} = {};

    /**
     * 音乐开关
     */
    public static get musicOn(): boolean {
        if (XAudio.musicState == null) {
            XAudio.loadStates();
        }
        return XAudio.musicState;
    }

    public static set musicOn(value: boolean) {
        let changed = XAudio.musicOn !== value;
        XAudio.musicState = value;
        if (changed && value === false) {
            cc.audioEngine.stopMusic();
            XAudio.realState = RealState.Stopped;
        }
        else if (changed && value === true) {
            if (!XAudio.musicPaused) {
                XAudio.playMusic(XAudio.playingMusic);
            }
        }
        if (changed) {
            XAudio.saveStates();
        }
    }

    /**
     * 音效开关
     */
    public static get soundOn(): boolean {
        if (XAudio.soundState == null) {
            XAudio.loadStates();
        }
        return XAudio.soundState;
    }

    public static set soundOn(value: boolean) {
        let changed = XAudio.soundOn !== value;
        XAudio.soundState = value;
        if (changed && !value) {
            cc.audioEngine.stopAllEffects();
        }
        if (changed) {
            XAudio.saveStates();
        }
    }

    /** 振动开关 */
    public static get vibrateOn(): boolean {
        if (XAudio.vibrateState == null) {
            XAudio.loadStates();
        }
        return XAudio.vibrateState;
    }

    public static set vibrateOn(value: boolean) {
        let changed = XAudio.vibrateOn !== value;
        XAudio.vibrateState = value;
        if (changed) {
            XAudio.saveStates();
        }
    }

    /**
     * 返回正在播放的音乐名称，不受静音影响
     */
    public static get playingMusic(): string {
        return XAudio.musicPlaying;
    }

    /**
     * 手动添加音频，适合手动加载音频时使用
     * @param name 音频名
     * @param clip 音频
     */
    public static addAudio(name: string, clip: cc.AudioClip) {
        XAudio.audioClips[name] = clip;
        if (XAudio.musicToPlay === name) {
            XAudio.playMusic(name);
        }
    }

    /**
     * 批量加载resources下的音乐，加载后的音频名为文件名
     * @param resFolder 目录名，默认为Audio
     */
    public static addResAudios(resFolder = 'Audio') {
        cc.loader.loadResDir(resFolder, cc.AudioClip, (err, assets, urls) => {
            if (err) {
                console.log(JSON.stringify(err));
                return;
            }
            assets.forEach((audioClip: cc.AudioClip) => {
                XAudio.audioClips[audioClip.name] = audioClip;
                if (XAudio.musicToPlay === audioClip.name) {
                    XAudio.playMusic(audioClip.name);
                }
            });
        });
    }

    /**
     * 添加远程音频
     * @param name 音频名
     * @param url 链接
     */
    public static addRemoteAudio(name: string, url: string) {
        (async () => {
            let audio = await xfire.loadRemoteAudio(url);
            if (audio) {
                XAudio.addAudio(name, audio);
            }
        })();
    }

    /**
     * 移除音频
     * @param name 音频名
     */
    public static removeAudio(name: string) {
        delete XAudio.audioClips[name];
    }

    /**
     * 获取音频
     * @param name 音频名
     */
    public static getAudio(name: string): cc.AudioClip {
        return XAudio.audioClips[name];
    }

    /**
     * 播放音乐
     * @param name 音频名
     * @param loop 是否循环，默认循环
     */
    public static playMusic(name: string, loop = true) {
        if (name == null || name === '') {
            return;
        }
        XAudio.musicPlaying = name;
        XAudio.musicPaused = false;
        let audio = XAudio.getAudio(name);
        if (!audio) {
            XAudio.musicToPlay = name;
        }
        if (!XAudio.musicOn) {
            if (audio) {
                XAudio.musicToPlay = null;
            }
            return;
        }
        if (audio) {
            cc.audioEngine.playMusic(XAudio.audioClips[name], loop);
            XAudio.realState = RealState.Playing;
            XAudio.musicToPlay = null;
        }
        else {
            console.log('音乐尚未加载：' + name);
        }
    }

    public static pauseMusic() {
        if (!XAudio.musicPlaying || XAudio.musicPaused) {
            return;
        }
        XAudio.musicPaused = true;
        cc.audioEngine.pauseMusic();
        XAudio.realState = XAudio.realState === RealState.Playing ? RealState.Paused : RealState.Stopped;
    }

    public static resumeMusic() {
        if (XAudio.musicOn && XAudio.musicPaused) {
            XAudio.musicPaused = false;
            if (XAudio.realState === RealState.Paused) {
                cc.audioEngine.resumeMusic();
                XAudio.realState = RealState.Playing;
            }
            else {
                XAudio.playMusic(XAudio.musicPlaying);
            }
        }
    }

    /**
     * 停止播放音乐
     */
    public static stopMusic() {
        cc.audioEngine.stopMusic();
        XAudio.realState = RealState.Stopped;
        XAudio.musicPaused = false;
        XAudio.musicToPlay = null;
        XAudio.musicPlaying = null;
    }

    /**
     * 播放音效，如果是循环播放还会返回一个播放句柄
     * @param name 音频名
     */
    public static playSound(name: string, loop = false): AudioHandle {
        if (!XAudio.soundOn) {
            return;
        }
        let ts = xfire.currentTimeMillis;
        let off = (ts - (XAudio.justPlayedSounds[name] || 0)) / 1000;
        if (off < XAudio.soundInterval) {
            return;
        }
        let audio = XAudio.getAudio(name);
        if (!audio) {
            return;
        }
        let id = cc.audioEngine.playEffect(audio, loop);
        XAudio.justPlayedSounds[name] = ts;
        return new AudioHandle(id);
    }

    /**
     * 停止播放指定音效
     * @param handle 播放句柄
     */
    public static stopSound(handle: AudioHandle) {
        if (handle != null) {
            cc.audioEngine.stopEffect(handle.id);
        }
    }

    /**
     * 停止所有音效的播放
     */
    public static stopSounds() {
        cc.audioEngine.stopAllEffects();
    }

    /** 短振动 */
    public static vibrateShort() {
        if (XAudio.vibrateOn && xfire.supportVibrate()) {
            xfire.vibrateShort();
        }
    }

    /** 长振动 */
    public static vibrateLong() {
        if (XAudio.vibrateOn && xfire.supportVibrate()) {
            xfire.vibrateLong();
        }
    }

    /**
     * 加载存档
     */
    private static loadStates() {
        let states = cc.sys.localStorage.getItem(AudioDoc);

        if (states == null || states === '') {
            // 默认音频 音效 振动 都开
            states = '{"s": true, "m": true, "v": true}';
        }
        try {
            let json = JSON.parse(states);
            XAudio.soundState = json.s === true;
            XAudio.musicState = json.m === true;
            XAudio.vibrateState = json.v === true;
        } catch (error) {
            XAudio.soundState = false;
            XAudio.musicState = false;
            XAudio.vibrateState = false;
        }
    }

    /**
     * 存档
     */
    private static saveStates() {
        if (XAudio.autoSave) {
            let doc = {s: XAudio.soundOn, m: XAudio.musicOn, v: XAudio.vibrateOn};
            cc.sys.localStorage.setItem(AudioDoc, JSON.stringify(doc));
        }
    }
}

/** 音乐音效句柄 */
export class AudioHandle {
    /** 内部操作句柄id */
    public id = -1;

    public constructor(id: number) {
        this.id = id;
    }

}
