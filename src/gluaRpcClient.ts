const rp = require('request-promise');

// TODO: use simplechain debugger

const endpoint = `http://localhost:8280/gluadebug`

export class GluaRpcClient {
	async getSpanStackTrace(spanId: string, seqInSpan: Number) {
		const url = `${endpoint}/api/trace/stack_trace/span`
		const res = await rp({
			method: 'POST',
			url: url,
			json: true,
			body: {
				spanId: spanId,
				seqInSpan: seqInSpan
			}
		})
		return res
	}
	async getStackVariables(spanId ?: string, seqInSpan ?: Number) {
		const url = `${endpoint}/api/trace/view_stack_variables/span`
		const reqData = {
			spanId, seqInSpan
		}
		const res = await rp({
			method: 'POST',
			url: url,
			body: reqData,
			json: true
		})
		return res
	}
	async listTraces() {
		const url = `${endpoint}/api/trace/list`
		const reqData = {
			page: 1,
			pageSize: 20
		}
		const res = await rp({
			method: 'POST',
			url: url,
			body: reqData,
			json: true
		})
		return res
	}
	async listSpansOfTrace(traceId: string) {
		const url = `${endpoint}/api/trace/list_spans/${traceId}`
		const res = await rp({
			method: 'GET',
			url: url,
			json: true
		})
		return res
	}
	async getNextRequest(traceId: string | undefined, spanId : string | undefined, seqInSpan: Number | undefined, stepType: string, breakpoints) {
		const url = `${endpoint}/api/trace/next_step_span_seq`
		const reqData = {
			traceId: traceId,
			currentSpanId: spanId,
			currentSeqInSpan: seqInSpan,
			stepType: stepType
		}
		const res = await rp({
			method: 'POST',
			url: url,
			body: reqData,
			json: true
		})
		return res
	}
	resolveFilename(moduleId: string, classname: string, filename: string): string {
		return `E:/projects/glua_common_contracts/token.glua` // TODO: 找到源码位置
	}
}

let currentTraceId: string = 'test' // ''  'test' is for development
let currentSpanId: string | undefined = undefined

export function setCurrentTraceId(traceId: string, spanId?: string) {
	currentTraceId = traceId
	currentSpanId = spanId
}

export function getCurrentTraceId(): string {
	return currentTraceId
}

export function getCurrentSpanId(): string | undefined {
	return currentSpanId
}