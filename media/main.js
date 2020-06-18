(function () {
	if (!contractAddress) {
		return;
	}
	const vscode = acquireVsCodeApi();
	vscode.setState(contractAddress)

	function callApi(method, params) {
		return axios.post(rpcEndpoint, {
			jsonrpc: '2.0',
			id: 1,
			method: method,
			params: params
		}).then(function (response) {
			console.log(response);
			if (response.status !== 200) {
				throw new Error(response.data)
			}
			if (response.data.error) {
				throw new Error(response.data.error)
			}
			return response.data.result
		})
	}

	new Vue({
		el: '#app',
		data: {
			contractInfo: {
				apis: [],
				offlineApis: [],
				ownerAddress: '',
				storageProperties: [],
				storageValues: {}
			}
		},
		mounted() {
			this.loadContractInfo()
			this.loadStoragesValues()
		},
		methods: {
			loadStoragesValues() {
				return callApi('get_contract_storages', [contractAddress])
					.then(storageValues => {
						console.log('storageValues', storageValues)
						for(const storageName in storageValues) {
							const value = storageValues[storageName]
							this.$set(this.contractInfo.storageValues, storageName, value)
						}
					})
					.catch(e => {
						console.log('get_contract_storages error', e)
					})
			},
			loadContractInfo() {
				callApi('get_contract_info', [contractAddress])
					.then((contractInfo) => {
						const apis = contractInfo.abi
						const offlineApis = contractInfo.offline_abi
						const ownerAddress = contractInfo.owner_address
						const storageProperties = contractInfo.storage_properties
						this.contractInfo.apis = apis
						this.contractInfo.offlineApis = offlineApis
						this.contractInfo.ownerAddress = ownerAddress
						this.contractInfo.storageProperties = storageProperties
					})
					.catch(e => {
						console.log('get_contract_info error', e)
					})
				axios.post(rpcEndpoint, {
					jsonrpc: '2.0',
					id: 1,
					method: 'get_contract_info',
					params: [contractAddress]
				}).then(function (response) {
					console.log(response);

				})
					.catch(function (error) {
						console.log(error);
					});
			}
		}
	});
})()
