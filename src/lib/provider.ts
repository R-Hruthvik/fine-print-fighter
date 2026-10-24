/** Safe errors cross the HTTP boundary; upstream response bodies never do. */
export class ProviderError extends Error {
  constructor(message: string, public status=502, public code='PROVIDER_ERROR', public retryable=true, public stage?:string) {
    super(message);
    this.name='ProviderError';
  }
}

export function requireProviderConfiguration(): void {
  if (!process.env.NEBIUS_API_KEY) {
    throw new ProviderError('Analysis is not configured. Set the Nebius API key on the server.',503,'CONFIGURATION_MISSING',false);
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

export async function llmToolTurn(options: { messages: Record<string, unknown>[]; tools: Record<string, unknown>[]; signal?: AbortSignal }): Promise<Record<string, unknown>> {
  const key=process.env.NEBIUS_API_KEY;
  if (!key) throw new ProviderError('The analysis model is not configured on the server.',503,'CONFIGURATION_MISSING',false);
  const base=(process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1').replace(/\/$/,'');
  const timeout=options.signal ? AbortSignal.any([options.signal,AbortSignal.timeout(25_000)]) : AbortSignal.timeout(25_000);
  try {
    const response=await fetch(`${base}/chat/completions`,{method:'POST',signal:timeout,headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.NEMOTRON_MODEL || 'nvidia/Nemotron-3_5-Lightning',temperature:0.1,max_tokens:1800,messages:options.messages,tools:options.tools,tool_choice:'auto'})});
    if (!response.ok) throw new ProviderError('The investigation model is unavailable. Please try again later.',502,'MODEL_UNAVAILABLE',response.status===429 || response.status>=500);
    const envelope:unknown=await response.json();
    if (!isObject(envelope) || !Array.isArray(envelope.choices) || !isObject(envelope.choices[0]) || !isObject(envelope.choices[0].message)) throw new ProviderError('The investigation model returned an invalid response.',502,'INVALID_MODEL_RESPONSE',true);
    return envelope.choices[0].message;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (options.signal?.aborted) throw new ProviderError('The analysis deadline was exceeded.',504,'ANALYSIS_TIMEOUT',true);
    if (timeout.aborted) throw new ProviderError('The investigation model timed out. Please try again.',504,'PROVIDER_TIMEOUT',true);
    throw new ProviderError('The investigation model could not be reached. Please try again.',502,'MODEL_UNAVAILABLE',true);
  }
}

export async function llmJSON<T>(options:LLMCallOptions, schemaHint:string, validate:(value:unknown)=>value is T):Promise<T> {
  const key=process.env.NEBIUS_API_KEY;
  if (!key) throw new ProviderError('The analysis model is not configured on the server.',503,'CONFIGURATION_MISSING',false);
  const base=(process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1').replace(/\/$/,'');
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
          model:process.env.NEMOTRON_MODEL || 'nvidia/Nemotron-3_5-Lightning',
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
