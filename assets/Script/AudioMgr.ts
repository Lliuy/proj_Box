import XAudio from "./XModule/XAudio";

const { ccclass, property } = cc._decorator;

@ccclass
export default class AudioMgr extends cc.Component {

	@property(cc.AudioClip)
	private bg: cc.AudioClip = null!;


	public onLoad() {

	}

	public start() {

	}

	public update(dt: any) {

	}
}