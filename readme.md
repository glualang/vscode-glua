vscode-glua
===================

this is vscode plugin for glua

# Features

* debugger by simplechain and gluac
* show simplechain contracts
* deploy contract to simplechain
* invoke contract and debug

# VSCode-glua Extension Usage

* put `gluac.exe` or `gluac`(when not Windows) to system env PATH
* run `simplechain.exe`
* open a contract source file(eg. mock_test/contract.glua or mock_test/token.glua)
* `Ctrl-P` and `>` to enter command mode and enter `compile contract` command.
* enter `deploy contract` command to deploy the contract
* in contracts explorer view, select the contract and api you want to run and debug
* center `F5` in your opened contract source file to start the debugger
