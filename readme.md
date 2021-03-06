vscode-glua
===================

this is vscode plugin for glua

# Features

* debugger by simplechain and gluac
* glua syntax highlight
* show simplechain contracts
* deploy contract to simplechain
* invoke contract and debug

# Screenshot

* debug contract source code

![alt vscode-glua-debug-contract.gif](./public/vscode-glua-debug-contract.gif)


* deploy contract and invoke contract api

![alt vscode-glua-create-contract.gif](./public/vscode-glua-create-contract.gif)

* view contract info and storages

![alt vscode-glua-contract-view.gif](./public/vscode-glua-contract-view.gif)

# VSCode-glua Extension Usage

* put `gluac.exe` or `gluac`(when not Windows) to system env PATH
* run `simplechain.exe`
* open a contract source file(eg. mock_test/contract.glua or mock_test/token.glua)
* `Ctrl-P` and `>` to enter command mode and enter `compile contract` command.
* enter `deploy contract` command to deploy the contract
* in contracts explorer view, select the contract and api you want to run and debug
* center `F5` in your opened contract source file to start the debugger
* view contract apis and storages and local variables/upvalues when debuging

# commands

* compile contract
* deploy contract
* invoke contract
* deposit contract
* generate block
* `F5` to start debugger
* `Ctrl-F5` to run without debugger
