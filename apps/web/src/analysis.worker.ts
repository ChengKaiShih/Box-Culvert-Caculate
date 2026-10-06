import {analyze} from '../../../packages/result-engine/src/index';
self.onmessage=(event)=>{try{const r=analyze(event.data.project,event.data.mode,(done,total)=>self.postMessage({type:'progress',done,total}));self.postMessage({type:'result',result:r});}catch(error){self.postMessage({type:'error',error:error instanceof Error?error.message:String(error)});}};
