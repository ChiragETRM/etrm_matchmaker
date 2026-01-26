import { handlers } from '@/lib/auth'
import { NextRequest } from 'next/server'

// #region agent log
const logAuthRequest = (method: string, url: string, error?: any) => {
  fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:6',message:'Auth route handler called',data:{method,url,hasHandlers:!!handlers,errorMessage:error?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'request',hypothesisId:'D,E'})}).catch(()=>{});
};
// #endregion

export async function GET(request: NextRequest) {
  // #region agent log
  logAuthRequest('GET', request.url);
  // #endregion
  try {
    if (!handlers?.GET) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:15',message:'GET handler missing',data:{hasHandlers:!!handlers},timestamp:Date.now(),sessionId:'debug-session',runId:'request',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      throw new Error('GET handler not available')
    }
    const response = await handlers.GET(request)
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:22',message:'GET handler executed successfully',data:{status:response?.status||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'request',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return response
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:27',message:'GET handler error',data:{errorMessage:error?.message||'unknown',errorStack:error?.stack?.substring(0,300)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'request',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw error
  }
}

export async function POST(request: NextRequest) {
  // #region agent log
  logAuthRequest('POST', request.url);
  // #endregion
  try {
    if (!handlers?.POST) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:38',message:'POST handler missing',data:{hasHandlers:!!handlers},timestamp:Date.now(),sessionId:'debug-session',runId:'request',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      throw new Error('POST handler not available')
    }
    const response = await handlers.POST(request)
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:43',message:'POST handler executed successfully',data:{status:response?.status||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'request',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return response
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:48',message:'POST handler error',data:{errorMessage:error?.message||'unknown',errorStack:error?.stack?.substring(0,300)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'request',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw error
  }
}
