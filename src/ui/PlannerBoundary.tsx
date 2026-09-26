import {Component,type ReactNode} from 'react';
/** A rendering/derivation failure must never trap the app in a blank editor. */
export class PlannerBoundary extends Component<{children:ReactNode;onExit:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main className="app-shell"><div role="alert"><h1>方案暂时无法显示</h1><p>原项目已保留，未删除或覆盖。请返回首页打开其他方案，或从备份恢复。</p></div><button onClick={this.props.onExit}>返回首页</button></main>:this.props.children;}
}
