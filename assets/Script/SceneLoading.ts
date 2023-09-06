
/*******************************************************************************
文件: SceneLoading.ts
创建: 2020年
作者:
描述:
	loading场景
*******************************************************************************/
import Archive from './Archive';
import Configs from './Configs';
import { ResourceData } from './GameData';
import NodeUtils from './NodeUtils';
import xfire from './XFire/xfire';
import XAudio from './XModule/XAudio';
import XTaskPool, { Task } from './XModule/XTaskPool';

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneLoading extends cc.Component {
	/** 配置文件 */
	@property(cc.JsonAsset)
	private xhAppCfg: cc.JsonAsset = null;
	/** 游戏配置文件 */
	@property(cc.JsonAsset)
	private gameCfg: cc.JsonAsset = null;
	/** 进度条 */
	@property(cc.ProgressBar)
	private progressBar: cc.ProgressBar = null;

	/** 任务池 */
	private taskPool = new XTaskPool({ fakeTotalPercents: 0.7 });

	public onLoad() {
		/** 在小游戏平台、原生平台默认是禁用动态合图的，这里给予直接关闭，确保开发时drawcall准确 */
		if (CC_DEV) cc.dynamicAtlasManager.enabled = false;
		// 初始化sdk配置
		xfire.initWithConfigs(this.xhAppCfg.json);

		// 存档处理
		{
			xfire.onShow(async () => {
				// 不锁屏
				xfire.setKeepScreenOn(true);
				await Archive.getInstance().load();
			});

			// 入后台存档
			xfire.onHide(() => {
				console.log('入后台存档');
				Archive.getInstance().save();
			});
		}


		// 显示分享菜单
		if (xfire.supportShare()) {
			xfire.showShareMenu();
			xfire.onShareAppMessage(() => {
				return {
					title: Configs.shareConfig.title,
					imageUrl: Configs.shareUrl
				};
			});
		}


		// IPad适配
		// this.node.getComponent(cc.Canvas).fitWidth = Utils.getPixelRatio() < 1.7;
		// NodeUtils.setNodeLabel(this.node, '版本', `版本:${xfire.getAppConfig().version}`);
	}

	public start() {

		// 资源加载
		this.loadResources();

		// 监听返回键
		// Utils.listenBackKey();
	}

	public update(dt: number) {
		// 更新进度
		if (this.progressBar) {
			if (this.taskPool.progress > this.progressBar.progress) this.progressBar.progress = this.taskPool.progress;
		}
	}

	/** 加载资源 */
	private async loadResources() {
		// 分包加载，指定为阻塞模式，先加载完分包再执行后续任务
		this.taskPool.addTask(new TaskLoadSubpackages(), 1, true);
		// 加载Audio目录下所有音频，不纳入进度
		this.taskPool.addTask(new TaskSimple(() => { XAudio.addResAudios(); }));
		// 任务：预加载场景
		this.taskPool.addTask(new TaskPreloadScene('App'));

		// 任务:  加载图集资源
		// this.taskPool.addTask(new TaskLoadAtalas());

		// 加载远程图集，【需要修改存储加载结果】
		// this.taskPool.addTask(new TaskLoadRemoteAtalas([
		//     {name: 'icons', url: 'https://imgcdn.orbn.top/g/038/assets/resources1/Atlas/icon.plist'}
		// ]));

		// 进入主场景
		cc.director.loadScene('App');
	}
}

////////////////////////////////////////////////////////////////////////////////
// 下方为任务定义
////////////////////////////////////////////////////////////////////////////////

/** 分包加载任务 */
class TaskLoadSubpackages extends Task {
	public constructor() {
		super();
	}
	public run(): void {
		(async () => {
			await xfire.loadSubpackages(['Resource'], (prog) => {
				this.progress = prog * 0.99;
			});
			cc.assetManager.loadBundle('Resource', (err: Error, bundle: cc.AssetManager.Bundle) => {
				ResourceData.resource = bundle;
				if (ResourceData.resource && ResourceData.remote) {
					this.endTask(true);
				}
				if (err) {
					console.error(err);
				}
			});
			cc.assetManager.loadBundle('Remote', (err: Error, bundle: cc.AssetManager.Bundle) => {
				ResourceData.remote = bundle;
				if (ResourceData.resource && ResourceData.remote) {
					this.endTask(true);
				}
				if (err) {
					console.error(err);
				}
			});
		})();
	}
}

/** 简单任务，只是执行一个函数，用于与阻塞任务排序 */
class TaskSimple extends Task {
	private runner: () => void = null;
	public constructor(runner: () => void) {
		super();
		this.runner = runner;
	}

	public run(): void {
		if (this.runner) {
			this.runner();
		}
		this.progress = 1;
		this.endTask(true);
	}
}

/** 场景预加载任务 */
class TaskPreloadScene extends Task {
	private sceneName = 'App';

	public constructor(sceneName: string) {
		super();
		this.sceneName = sceneName;
	}

	public run() {
		cc.director.preloadScene(
			this.sceneName,
			(completeCount, totalCount) => {
				let progress = completeCount / totalCount;
				this.progress = Math.max(this.progress, progress);
			},
			() => {
				this.progress = 1;
			}
		);
	}
}

/** 预制体挨个加载 */
class TaskPreloadPrefab extends Task {
	private prefabNames: string[] = [];

	public constructor(prefabNames: string[]) {
		super();
		this.prefabNames = prefabNames;
	}

	public run(): void {
		let count = 0;
		if (this.prefabNames.length === 0) {
			this.progress = 1;
			return;
		}
		this.prefabNames.forEach(async (name) => {
			count++;
			this.progress = count / this.prefabNames.length;

			ResourceData.resource.load('Prefab/' + name, cc.Prefab, (err: Error, prefab: cc.Prefab) => {
				count++;
				this.progress = count / this.prefabNames.length;
				if (err) {
					console.error('加载错误:', name, err);
				}
				// 存储加载结果
				ResourceData.prefabs[prefab.name] = prefab;
			});
		});
	}
}

/** 预制体批量加载 */
class TaskPreloadPrefabs extends Task {
	public dir: string;

	public constructor(dir: string) {
		super();
		this.dir = dir;
	}
	public run(): void {
		// 加载地图
		ResourceData.resource.loadDir(
			this.dir,
			cc.Prefab,
			(finish: number, total: number, item: cc.AssetManager.RequestItem) => {
				if (total === 0) {
					this.progress = 1;
				} else {
					this.progress = finish / total;
				}
			},
			(error, prefabs: cc.Prefab[]) => {
				this.progress = 1;
				if (prefabs) {
					for (let prefab of prefabs) {
						ResourceData.prefabs[prefab.name] = prefab;
					}
				}
			}
		);
	}
}

/** 预加载远程图集 */
class TaskLoadRemoteAtalas extends Task {
	private atlasUrls: { name: string; url: string }[] = [];

	public constructor(atlasUrls: { name: string; url: string }[]) {
		super();
		this.atlasUrls = atlasUrls;
	}
	public run(): void {
		let count = 0;
		if (this.atlasUrls.length === 0) {
			this.progress = 1;
			return;
		}
		this.atlasUrls.forEach(async (url) => {
			let atlas = await xfire.loadRemoteSpriteAtlas(url.url);
			if (!atlas) {
				console.error(`图集:${url.url}加载失败`);
				return;
			}
			count++;
			this.progress = count / this.atlasUrls.length;
			// TODO存储加载结果
			// GameData.atlas[url.name] = atlas;
		});
	}
}

class TaskLoadAtalas extends Task {
	private atlasNames: string[] = [];
	public constructor(names: string[]) {
		super();
		this.atlasNames = names;
	}
	public run(): void {
		let count = 0;
		if (this.atlasNames.length === 0) {
			this.progress = 1;
			return;
		}
		this.atlasNames.forEach(async (name) => {
			ResourceData.resource.load('Atlas/' + name, cc.SpriteAtlas, (err: Error, atlas: cc.SpriteAtlas) => {
				count++;
				if (err) {
					console.error(err);
				}
				this.progress = count / this.atlasNames.length;
				// TODO存储加载结果
			});
		});
	}
}

