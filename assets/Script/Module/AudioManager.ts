import XAudio from "../XModule/XAudio";
import XEngineExt from "../XModule/XEngineExt";

export default class AudioManager {
	public static instance() {
		if (!this._instance) {
			this._instance = new AudioManager();
		}
		return this._instance;
	}

	private soundOn = true;
	private musicOn = true;

	public static _instance: AudioManager = null;

	public static overrideButton(): void {
		XEngineExt.extendButton(true, (button, data) => {
			if (data) {
				XAudio.playSound(AudioName.按钮);
			}
		});
	}

	public onShow() {
		cc.audioEngine.resumeAllEffects();
		XAudio.resumeMusic();
	}

	public onHide() {
		cc.audioEngine.pauseAllEffects();
		XAudio.pauseMusic();
	}
}
export let AudioName = {
	背景: 'BG',
	消除: '消除2',
	按钮: '按钮2',
	放下: '按钮',
	游戏失败:'游戏失败',
}
