/** Safe errors cross the HTTP boundary; upstream response bodies never do. */
export class ProviderError extends Error {
  constructor(message: string, public status=502, public code='PROVIDER_ERROR', public retryable=true, public stage?:string) {
    super(message);
    this.name='ProviderError';
  }
}

export function requireProviderConfiguration(): void {
  if (!process.env.NEBIUS_API_KEY || !process.env.TAVILY_API_KEY) {
    throw new ProviderError('Analysis is not configured. Set the Nebius and Tavily API keys on the server.',503,'CONFIGURATION_MISSING',false);
  }
}

export interface LLMCallOptions {
  system:string;
  user:string;
  temperature?:number;
  maxTokens?:number;
  retries?:number;
  signal?:AbortSignal;
}

export async function llmJSON<T>(options:LLMCallOptions, schemaHint:string, validate:(value:unknown)=>value is T):Promise<T> {
  const key=process.env.NEBIUS_API_KEY;
  if (!key) throw new ProviderError('The analysis model is not configured on the server.',503,'CONFIGURATION_MISSING',false);
  const base=(process.env.NEBIUS_BASE_URL || 'https://api.nebius.ai/v1').replace(/\/$/,'');
  const attempts=Math.min(2,Math.max(1,(options.retries ?? 1)+1));
  let repair=false;
  for (let attempt=0;attempt<attempts;attempt++) {
    options.signal?.throwIfAborted();
    const signal=options.signal ? AbortSignal.any([options.signal,AbortSignal.timeout(25_000)]) : AbortSignal.timeout(25_000);
    try {
      const response=await fetch(`${base}/chat/completions`, {
        method:'POST',signal,
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
        body:JSON.stringify({
          model:process.env.NEMOTRON_MODEL || 'nvidia/nemotron-4-340b-instruct',
          temperature:options.temperature ?? 0.1,max_tokens:options.maxTokens ?? 2500,
          messages:[{role:'system',content:options.system},{role:'user',content:options.user + (repair ? `\nYour last response was invalid. Return only JSON matching this schema: ${schemaHint}` : '')}],
          response_format:{type:'json_object'},
        }),
      });
      if (!response.ok) {
        const transient=response.status===429 || response.status>=500;
        if (transient && attempt+1<attempts) continue;
        throw new ProviderError('The analysis provider is unavailable. Please try again later.',502,'MODEL_UNAVAILABLE',transient);
      }
      const envelope:unknown=await response.json();
      const content=getContent(envelope);
      if (content && content.length<=100_000) {
        try {
          const value:unknown=JSON.parse(content);
          if (validate(value)) return value;
        } catch { /* A single bounded repair follows below. */ }
      }
      repair=true;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (options.signal?.aborted) throw new ProviderError('The analysis deadline was exceeded.',504,'ANALYSIS_TIMEOUT',true);
      if (signal.aborted && attempt+1===attempts) throw new ProviderError('The analysis provider timed out. Please try again.',504,'PROVIDER_TIMEOUT',true);
      if (attempt+1===attempts) throw new ProviderError('The analysis provider could not return a valid response. Please try again.',502,'INVALID_MODEL_RESPONSE',true);
    }
  }
  throw new ProviderError('The analysis provider could not return a valid response. Please try again.',502,'INVALID_MODEL_RESPONSE',true);
}

function getContent(value:unknown):string | undefined {
  if (!isObject(value) || !Array.isArray(value.choices)) return undefined;
  const first=value.choices[0];
  if (!isObject(first) || !isObject(first.message)) return undefined;
  return typeof first.message.content==='string' ? first.message.content : undefined;
}

export function isObject(value:unknown):value is Record<string,unknown> {
  return typeof value==='object' && value!==null && !Array.isArray(value);
}
export function stringList(value:unknown, max=30):value is string[] {
  return Array.isArray(value) && value.length<=max && value.every(item => typeof item==='string' && item.length<=5000);
}
export function text(value:unknown, max=8000):value is string {
  return typeof value==='string' && value.length<=max;
}
