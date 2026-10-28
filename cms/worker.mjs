import {onRequest} from './middleware.mjs';
export default {
 fetch(request,env){return onRequest({request,env,next:()=>env.ASSETS.fetch(request)});}
};
