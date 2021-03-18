/*
Copyright 2019 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

function stdparser(c)
{
    if (this.str = null) { this.str = ''; }
    this.str += c.toString();
}

function getKeys()
{
    var ret = {};
    child = require('child_process').execFile(process.env['windir'] + "\\System32\\bcdedit.exe", ['bcdedit', '/enum', '{current}']);
    child.stdout.str = ''; child.stdout.on('data', stdparser);
    child.stderr.on('data', stdparser);
    child.waitExit();

    var lines = child.stdout.str.trim().split('\r\n');
    lines.shift(); lines.shift();

    for (var i in lines)
    {
        var tokens = lines[i].split(' ');
        var key = tokens.shift();
        var value = tokens.join(' ').trim();
        ret[key] = value;
    }
    return (ret);
}
function getKey(key)
{
    return (this.getKeys()[key]);
}
function setKey(key, value)
{
    var child = require('child_process').execFile(process.env['windir'] + "\\System32\\bcdedit.exe", ['bcdedit', '/set', '{current}', key, value]);
    child.stdout.str = ''; child.stdout.on('data', stdparser);
    child.stderr.on('data', stdparser);
    child.waitExit();
}
function deleteKey(key)
{
    var child = require('child_process').execFile(process.env['windir'] + "\\System32\\bcdedit.exe", ['bcdedit', '/deletevalue', '{current}', key]);
    child.stdout.str = ''; child.stdout.on('data', stdparser);
    child.stderr.on('data', stdparser);
    child.waitExit();
}

function enableSafeModeService(serviceName)
{
    require('win-registry').WriteKey(require('win-registry').HKEY.LocalMachine, 'SYSTEM\\CurrentControlSet\\Control\\Safeboot\\Network\\' + serviceName, null, 'Service');
}
function isSafeModeService(serviceName)
{
    var reg = require('win-registry');
    var key = { default: 'none' };
    try { key = reg.QueryKey(reg.HKEY.LocalMachine, 'SYSTEM\\CurrentControlSet\\Control\\Safeboot\\Network\\' + serviceName); } catch (qke) { }
    return (key.default == 'Service');
}
function disableSafeModeService(serviceName)
{
    try
    {
        require('win-registry').DeleteKey(require('win-registry').HKEY.LocalMachine, 'SYSTEM\\CurrentControlSet\\Control\\Safeboot\\Network\\' + serviceName);
    }
    catch(x)
    {
    }
}

function restart(delay)
{
    var child = require('child_process').execFile(process.env['windir'] + "\\System32\\shutdown.exe", ['shutdown', '/r', '/t', delay!=null?delay.toString():'0']);
    child.stdout.str = ''; child.stdout.on('data', stdparser);
    child.stderr.on('data', stdparser);
    child.waitExit();
}

if (require('_GenericMarshal').PointerSize == 4 && require('os').arch() == 'x64')
{
    module.exports =
    {
        enableSafeModeService: enableSafeModeService,
        disableSafeModeService: disableSafeModeService, restart: restart, isSafeModeService: isSafeModeService
    };
}
else
{
    module.exports =
        {
            getKeys: getKeys, setKey: setKey, deleteKey: deleteKey, enableSafeModeService: enableSafeModeService,
            disableSafeModeService: disableSafeModeService, getKey: getKey, restart: restart, isSafeModeService: isSafeModeService
        };

    Object.defineProperty(module.exports, "bootMode",
        {
            get: function ()
            {
                try
                {
                    var v = require('win-registry').QueryKey(require('win-registry').HKEY.LocalMachine, 'SYSTEM\\CurrentControlSet\\Control\\Safeboot\\Option', 'OptionValue');
                    switch (v)
                    {
                        case 2:
                            return ('SAFE_MODE_NETWORK');
                            break;
                        default:
                            return ('SAFE_MODE');
                            break;
                    }
                    return (v);
                }
                catch (x)
                {
                    return ('NORMAL');
                }
            }
        });
}