const rp = require('request-promise');

const defaultEndpoint = `http://localhost:8080/api`
let endpoint = defaultEndpoint

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
		if (!res) {
			throw new Error(`rpc ${method} error empty response`)
		}
		if (res.error) {
			throw new Error(`rpc ${method} error ${res.error}`)
		}
		return res.result
	}
	async generateBlock() {
		await this.callRpc('generate_block', [1])
	}
	async deployContract(contractPath: string) {
		const callerAddr = 'test'
		const gasLimit = 10000;
		const gasPrice = 1
		const { contract_address, txid } = await this.callRpc('create_contract_from_file', [callerAddr, contractPath, gasLimit, gasPrice])
		console.log(`deploy contract txid ${txid} contract address ${contract_address}`)
		await this.generateBlock()
		return contract_address
	}
	async listContracts() {
		const res = await this.callRpc('list_contracts', [])
		return res
	}
	async getContractInfo(contractId: string) {
		const res = await this.callRpc('get_contract_info', [contractId])
		return res
	}
	async getContractInfoWithCache(contractId: string) {
		for(const addr in contractInfoMapping) {
			if(addr === contractId) {
				return contractInfoMapping[addr]
			}
		}
		const info = await this.getContractInfo(contractId)
		contractInfoMapping[contractId] = info
		return info
	}
	async clearBreakpoints() {
		await this.callRpc('clear_breakpoints_in_last_debugger_state', [])
	}
	async setBreakpoint(contractAddr: string, line: number) {
		await this.callRpc('set_breakpoint', [contractAddr, line])
	}
	async invokeContract(contractAddr: string, apiName: string, apiArgs: any, callerAddr: string='test', gasLimit: number=10000, gasPrice: number=1) {
		const depositAssetId = 0
		const depositAmount = 0
		const res = await this.callRpc('invoke_contract', [callerAddr, contractAddr, apiName, apiArgs, depositAssetId, depositAmount, gasLimit, gasPrice])
		return res
	}
	async depositToContract(contractAddr: string, apiArgs: any, depositAssetId: number, depositAmount: number, callerAddr: string='test', gasLimit: number=10000, gasPrice: number=1) {
		const apiName = 'on_deposit_asset'
		const res = await this.callRpc('invoke_contract', [callerAddr, contractAddr, apiName, apiArgs, depositAssetId, depositAmount, gasLimit, gasPrice])
		return res
	}
	async invokeContractOffline(contractAddr: string, apiName: string, apiArgs: any, callerAddr: string='test') {
		const depositAssetId = 0
		const depositAmount = 0
		const res = await this.callRpc('invoke_contract_offline', [callerAddr, contractAddr, apiName, apiArgs, depositAssetId, depositAmount])
		return res
	}
	async debuggerInvokeContract(contractAddr: string, apiName: string, apiArgs: any, callerAddr: string='test', gasLimit: number=10000, gasPrice: number=1) {
		const depositAssetId = 0
		const depositAmount = 0
		const res = await this.callRpc('debugger_invoke_contract',
			[callerAddr, contractAddr, apiName, apiArgs, depositAssetId, depositAmount, gasLimit, gasPrice])
		return res
	}
	async viewDebugState() {
		const res = await this.callRpc('view_debug_info', [])
		return res
	}
	async getCurrentDebugStateContractId(): Promise<string | undefined> {
		const res = await this.viewDebugState()
		if(res.line <= 0) {
			return undefined
		}
		return res.contractid
	}
	async getSpanStackTrace(spanId: string, seqInSpan: Number) {
		let res = await this.callRpc('view_call_stack', [])
		console.log('view_call_stack raw response', res)
		const stacktrace: Array<any> = []
		for(const item of res) {
			const splited = item.split(',')
			if(splited.length>0) {
				const stackItem = {}
				for(const s of splited) {
					if(s.indexOf(':')>0) {
						const key = s.substring(0, s.indexOf(':'))
						const value = s.substring(s.indexOf(':')+1)
						stackItem[key] = value
						if(key==='line') {
							stackItem['line'] = parseInt(value)
						}
					}
				}
				stacktrace.push(stackItem)
			}
		}
		return stacktrace
	}
	// get upvalues
	async getStackUpvalues() {
		const res = await this.callRpc('view_upvalues_in_last_debugger_state', [])
		return res
	}

	async getStackVariables() {
		const res = await this.callRpc('view_localvars_in_last_debugger_state', [])
		return res
	}
	async getStackStorageValue(storageName: string) {
		const res = await this.callRpc('view_current_contract_storage_value', [storageName, '', false])
		return res[storageName]
	}
	async getStackStorageValuesBatch(storageNames: Array<string>) {
		const res = await this.callRpc('view_current_contract_storage_value_batch', [storageNames.map(name => [name, '', false])])
		return res
	}
	async getNextRequest(traceId: string | undefined, spanId: string | undefined, seqInSpan: Number | undefined, stepType: string, breakpoints) {
		const rpcMethod = `debugger_${stepType}`
		const res = await this.callRpc(rpcMethod, [])
		return res
	}
	resolveFilename(item: any): string {
		return getCurrentProgramPath() || ''
	}
}

let currentContractId: string = '' // ''  'test' is for development
let currentContractApi: string | undefined = undefined // undefined
let currentProgramPath: string | undefined = undefined
let contractInfoMapping: {} = {} // 当前已知的contract info address => info mapping

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

export function setCurrentProgramPath(path: string) {
	currentProgramPath = path
}

export function getCurrentProgramPath() {
	return currentProgramPath
}

export function setRpcEndpoint(newEndpoint: string) {
	endpoint = newEndpoint
}

export function getRpcEndpoint() {
	return endpoint
}

export function getDefaultRpcEndpoint(): string {
	return defaultEndpoint
}
