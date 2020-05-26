const rp = require('request-promise');

// TODO: use simplechain debugger

const endpoint = `http://localhost:5050/api`

export class GluaRpcClient {
	async callRpc(method: string, params: Array<any>) {
		const res = await rp({
			method: 'POST',
			url: endpoint,
			json: true,
			body: {
				jsonrpc: '2.0',
				id: 1,
				method,
				params
			}
		})
		if(!res) {
			throw new Error(`rpc ${method} error empty response`)
		}
		if(res.error) {
			throw new Error(`rpc ${method} error ${res.error}`)
		}
		return res.result
	}
	async generateBlock() {
		await this.callRpc('generate_block', [1])
	}
	// TODO: compile contract, start debugger by invoke contract
	async deployContract(contractPath: string) {
		const callerAddr = 'test'
		const gasLimit = 10000;
		const gasPrice = 1
		const {contract_address, txid} = await this.callRpc('create_contract_from_file', [callerAddr, contractPath, gasLimit, gasPrice])
		console.log(`deploy contract txid ${txid} contract address ${contract_address}`)
		await this.generateBlock()
		return contract_address
	}
	async listContracts() {
		const res = await this.callRpc('list_contracts', [])
		return res
	}
	async clearBreakpoints() {
		await this.callRpc('clear_breakpoints_in_last_debugger_state', [])
	}
	async setBreakpoint(contractAddr: string, line: number) {
		await this.callRpc('set_breakpoint', [contractAddr, line])
	}
	async debuggerInvokeContract(contractAddr: string, apiName: string, apiArgs: any) {
		const callerAddr = 'test'
		const depositAssetId = 0
		const depositAmount = 0
		const gasLimit = 10000
		const gasPrice = 1
		const res = await this.callRpc('debugger_invoke_contract',
			[callerAddr, contractAddr, apiName, apiArgs, depositAssetId, depositAmount, gasLimit, gasPrice])
		return res
	}
	async getSpanStackTrace(spanId: string, seqInSpan: Number) {
		let res = await this.callRpc('view_call_stack', [])
		// TODO: now simplechain call stack have some problems
		res = [
			'TODO'
		]
		return res
	}
	// TODO: get upvalues

	async getStackVariables(spanId ?: string, seqInSpan ?: Number) {
		const res = await this.callRpc('view_localvars_in_last_debugger_state', [])
		return res
	}
	async listTraces() {
		// TODO
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
		// TODO
		const url = `${endpoint}/api/trace/list_spans/${traceId}`
		const res = await rp({
			method: 'GET',
			url: url,
			json: true
		})
		return res
	}
	async getNextRequest(traceId: string | undefined, spanId : string | undefined, seqInSpan: Number | undefined, stepType: string, breakpoints) {
		const res = await this.callRpc(`debugger_${stepType}`, [])
		return res
	}
	resolveFilename(item: any): string {
		return `/home/developer/repos/vscode-glua-extension/mock_test/token.glua` // TODO: 找到源码位置
	}
}

let currentContractId: string = 'CON12a1119f2d28687b0b4000c8dfbc5b75c415f69b' // ''  'test' is for development
let currentContractApi: string | undefined = 'state' // undefined

export function setCurrentContractId(contractId: string, apiName?: string) {
	currentContractId = contractId
	currentContractApi = apiName
}

export function getCurrentContractId(): string {
	return currentContractId
}

export function getCurrenContractApi(): string | undefined {
	return currentContractApi
}