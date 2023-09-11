const { ccclass, property } = cc._decorator;

@ccclass
export default class PageSet extends cc.Component {

	private static instance: PageSet;
	public static getInstance(): PageSet {
		return PageSet.instance;
	}

	public constructor() {
		super();
		PageSet.instance = this;
	}

	public onLoad () {

	}

	public start () {


	}

	public update (dt:any) {

	}

}
