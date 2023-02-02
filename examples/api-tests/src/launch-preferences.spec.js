// *****************************************************************************
// Copyright (C) 2019 TypeFox and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
// *****************************************************************************

// @ts-check
/* @typescript-eslint/no-explicit-any */

/**
 * @typedef {'.vscode' | '.theia' | ['.theia', '.vscode']} ConfigMode
 */

/**
 * Expectations should be tested and aligned against VS Code.
 * See https://github.com/akosyakov/vscode-launch/blob/master/src/test/extension.test.ts
 */
describe('Launch Preferences', function () {
    this.timeout(10_000);

    const { assert } = chai;

    const { PreferenceProvider } = require('@theia/core/lib/browser');
    const { PreferenceService, PreferenceScope } = require('@theia/core/lib/browser/preferences/preference-service');
    const { WorkspaceService } = require('@theia/workspace/lib/browser/workspace-service');
    const { FileService } = require('@theia/filesystem/lib/browser/file-service');
    const { FileResourceResolver } = require('@theia/filesystem/lib/browser/file-resource');
    const { AbstractResourcePreferenceProvider } = require('@theia/preferences/lib/browser/abstract-resource-preference-provider');
    const { waitForEvent } = require('@theia/core/lib/common/promise-util');

    const container = window.theia.container;
    /** @type {import('@theia/core/lib/browser/preferences/preference-service').PreferenceService} */
    const preferences = container.get(PreferenceService);
    /** @type {import('@theia/preferences/lib/browser/user-configs-preference-provider').UserConfigsPreferenceProvider} */
    const userPreferences = container.getNamed(PreferenceProvider, PreferenceScope.User);
    /** @type {import('@theia/preferences/lib/browser/workspace-preference-provider').WorkspacePreferenceProvider} */
    const workspacePreferences = container.getNamed(PreferenceProvider, PreferenceScope.Workspace);
    /** @type {import('@theia/preferences/lib/browser/folders-preferences-provider').FoldersPreferencesProvider} */
    const folderPreferences = container.getNamed(PreferenceProvider, PreferenceScope.Folder);
    const workspaceService = container.get(WorkspaceService);
    const fileService = container.get(FileService);
    const fileResourceResolver = container.get(FileResourceResolver);

    const defaultLaunch = {
        'configurations': [],
        'compounds': []
    };

    const validConfiguration = {
        'name': 'Launch Program',
        'program': '${file}',
        'request': 'launch',
        'type': 'node',
    };

    const validConfiguration2 = {
        'name': 'Launch Program 2',
        'program': '${file}',
        'request': 'launch',
        'type': 'node',
    };

    const bogusConfiguration = {};

    const validCompound = {
        'name': 'Compound',
        'configurations': [
            'Launch Program',
            'Launch Program 2'
        ]
    };

    const bogusCompound = {};

    const bogusCompound2 = {
        'name': 'Compound 2',
        'configurations': [
            'Foo',
            'Launch Program 2'
        ]
    };

    const validLaunch = {
        configurations: [validConfiguration, validConfiguration2],
        compounds: [validCompound]
    };

    testSuite({
        name: 'No Preferences',
        expectation: defaultLaunch
    });

    testLaunchAndSettingsSuite({
        name: 'Empty With Version',
        launch: {
            'version': '0.2.0'
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [],
            'compounds': []
        }
    });

    testLaunchAndSettingsSuite({
        name: 'Empty With Version And Configurations',
        launch: {
            'version': '0.2.0',
            'configurations': [],
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [],
            'compounds': []
        }
    });

    testLaunchAndSettingsSuite({
        name: 'Empty With Version And Compounds',
        launch: {
            'version': '0.2.0',
            'compounds': []
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [],
            'compounds': []
        }
    });

    testLaunchAndSettingsSuite({
        name: 'Valid Conf',
        launch: {
            'version': '0.2.0',
            'configurations': [validConfiguration]
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [validConfiguration],
            'compounds': []
        }
    });

    testLaunchAndSettingsSuite({
        name: 'Bogus Conf',
        launch: {
            'version': '0.2.0',
            'configurations': [validConfiguration, bogusConfiguration]
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [validConfiguration, bogusConfiguration],
            'compounds': []
        }
    });

    testLaunchAndSettingsSuite({
        name: 'Completely Bogus Conf',
        launch: {
            'version': '0.2.0',
            'configurations': { 'valid': validConfiguration, 'bogus': bogusConfiguration }
        },
        expectation: {
            'version': '0.2.0',
            'configurations': { 'valid': validConfiguration, 'bogus': bogusConfiguration },
            'compounds': []
        }
    });

    const arrayBogusLaunch = [
        'version', '0.2.0',
        'configurations', { 'valid': validConfiguration, 'bogus': bogusConfiguration }
    ];
    testSuite({
        name: 'Array Bogus Launch Configuration',
        launch: arrayBogusLaunch,
        expectation: {
            '0': 'version',
            '1': '0.2.0',
            '2': 'configurations',
            '3': { 'valid': validConfiguration, 'bogus': bogusConfiguration },
            'compounds': [],
            'configurations': []
        },
        inspectExpectation: {
            preferenceName: 'launch',
            defaultValue: defaultLaunch,
            workspaceValue: {
                '0': 'version',
                '1': '0.2.0',
                '2': 'configurations',
                '3': { 'valid': validConfiguration, 'bogus': bogusConfiguration }
            }
        }
    });
    testSuite({
        name: 'Array Bogus Settings Configuration',
        settings: {
            launch: arrayBogusLaunch
        },
        expectation: {
            '0': 'version',
            '1': '0.2.0',
            '2': 'configurations',
            '3': { 'valid': validConfiguration, 'bogus': bogusConfiguration },
            'compounds': [],
            'configurations': []
        },
        inspectExpectation: {
            preferenceName: 'launch',
            defaultValue: defaultLaunch,
            workspaceValue: arrayBogusLaunch
        }
    });

    testSuite({
        name: 'Null Bogus Launch Configuration',
        // eslint-disable-next-line no-null/no-null
        launch: null,
        expectation: {
            'compounds': [],
            'configurations': []
        }
    });
    testSuite({
        name: 'Null Bogus Settings Configuration',
        settings: {
            // eslint-disable-next-line no-null/no-null
            'launch': null
        },
        expectation: {}
    });

    testLaunchAndSettingsSuite({
        name: 'Valid Compound',
        launch: {
            'version': '0.2.0',
            'configurations': [validConfiguration, validConfiguration2],
            'compounds': [validCompound]
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [validConfiguration, validConfiguration2],
            'compounds': [validCompound]
        }
    });

    testLaunchAndSettingsSuite({
        name: 'Valid And Bogus',
        launch: {
            'version': '0.2.0',
            'configurations': [validConfiguration, validConfiguration2, bogusConfiguration],
            'compounds': [validCompound, bogusCompound, bogusCompound2]
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [validConfiguration, validConfiguration2, bogusConfiguration],
            'compounds': [validCompound, bogusCompound, bogusCompound2]
        }
    });

    testSuite({
        name: 'Mixed',
        launch: {
            'version': '0.2.0',
            'configurations': [validConfiguration, bogusConfiguration],
            'compounds': [bogusCompound, bogusCompound2]
        },
        settings: {
            launch: {
                'version': '0.2.0',
                'configurations': [validConfiguration2],
                'compounds': [validCompound]
            }
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [validConfiguration, bogusConfiguration],
            'compounds': [bogusCompound, bogusCompound2]
        }
    });

    testSuite({
        name: 'Mixed Launch Without Configurations',
        launch: {
            'version': '0.2.0',
            'compounds': [bogusCompound, bogusCompound2]
        },
        settings: {
            launch: {
                'version': '0.2.0',
                'configurations': [validConfiguration2],
                'compounds': [validCompound]
            }
        },
        expectation: {
            'version': '0.2.0',
            'configurations': [validConfiguration2],
            'compounds': [bogusCompound, bogusCompound2]
        },
        inspectExpectation: {
            preferenceName: 'launch',
            defaultValue: defaultLaunch,
            workspaceValue: {
                'version': '0.2.0',
                'configurations': [validConfiguration2],
                'compounds': [bogusCompound, bogusCompound2]
            }
        }
    });

    /**
     * @typedef {Object} LaunchAndSettingsSuiteOptions
     * @property {string} name
     * @property {any} expectation
     * @property {any} [launch]
     * @property {boolean} [only]
     * @property {ConfigMode} [configMode]
     */
    /**
     * @type {(options: LaunchAndSettingsSuiteOptions) => void}
     */
    function testLaunchAndSettingsSuite({
        name, expectation, launch, only, configMode
    }) {
        testSuite({
            name: name + ' Launch Configuration',
            launch,
            expectation,
            only,
            configMode
        });
        testSuite({
            name: name + ' Settings Configuration',
            settings: {
                'launch': launch
            },
            expectation,
            only,
            configMode
        });
    }

    /**
     * @typedef {Partial<import('@theia/core/src/browser/preferences/preference-service').PreferenceInspection<any>>} PreferenceInspection
     */

    /**
     * @typedef {Object} SuiteOptions
     * @property {string} name
     * @property {any} expectation
     * @property {PreferenceInspection} [inspectExpectation]
     * @property {any} [launch]
     * @property {any} [settings]
     * @property {boolean} [only]
     * @property {ConfigMode} [configMode]
     */
    /**
     * @type {(options: SuiteOptions) => void}
     */
    function testSuite(options) {
        describe(options.name, () => {

            if (options.configMode) {
                testConfigSuite(options);
            } else {

                testConfigSuite({
                    ...options,
                    configMode: '.theia'
                });

                if (options.settings || options.launch) {
                    testConfigSuite({
                        ...options,
                        configMode: '.vscode'
                    });

                    testConfigSuite({
                        ...options,
                        configMode: ['.theia', '.vscode']
                    });
                }
            }

        });

    }

    const rootUri = workspaceService.tryGetRoots()[0].resource;

    /**
     * @param uri the URI of the file to modify
     * @returns {AbstractResourcePreferenceProvider | undefined} The preference provider matching the provided URI.
     */
    function findProvider(uri) {
        console.log('findProvider(). uri of file to modify: ' + uri.toString());
        /**
         * @param {PreferenceProvider} provider
         * @returns {boolean} whether the provider matches the desired URI.
         */
        const isMatch = (provider) => {
            const configUri = provider.getConfigUri();
            return configUri && uri.isEqual(configUri);
        };
        for (const provider of userPreferences['providers'].values()) {
            if (isMatch(provider) && provider instanceof AbstractResourcePreferenceProvider) {
                console.log('provider: userPreferences');
                return provider;
            }
        }
        for (const provider of folderPreferences['providers'].values()) {
            if (isMatch(provider) && provider instanceof AbstractResourcePreferenceProvider) {
                console.log('provider: folderPreferences');
                return provider;
            }
        }
        /** @type {PreferenceProvider} */
        const workspaceDelegate = workspacePreferences['delegate'];
        if (workspaceDelegate !== folderPreferences) {
            if (isMatch(workspaceDelegate) && workspaceDelegate instanceof AbstractResourcePreferenceProvider) {
                console.log('provider: workspacePreferences');
                return workspaceDelegate;
            }
        }
    }

    function deleteWorkspacePreferences() {
        const promises = [];
        for (const configPath of ['.theia', '.vscode']) {
            for (const name of ['settings', 'launch']) {
                promises.push((async () => {
                    const uri = rootUri.resolve(configPath + '/' + name + '.json');
                    console.log('*** deleteWorkspacePreferences : findProvider() call');
                    const provider = findProvider(uri);
                    try {
                        if (provider) {
                            if (provider.valid) {
                                await waitForEvent(provider.onDidChangeValidity, 5000);
                            }
                            await provider['readPreferencesFromFile']();
                            await provider['fireDidPreferencesChanged']();
                        } else {
                            console.log('Unable to find provider for', uri.path.toString());
                        }
                    } catch (e) {
                        console.error(e);
                    }
                })());
            }
        }
        return Promise.all([
            ...promises,
            fileService.delete(rootUri.resolve('.theia'), { fromUserGesture: false, recursive: true }).catch(() => { }),
            fileService.delete(rootUri.resolve('.vscode'), { fromUserGesture: false, recursive: true }).catch(() => { })
        ]);
    }

    const originalShouldOverwrite = fileResourceResolver['shouldOverwrite'];

    before(async () => {
        console.log('*** launch-preferences:before() - enter');
        // TODO: There's an occasional exception that seems to happen here:
        /**
         * 1) Launch Preferences
       "before all" hook in "Launch Preferences":
     Uncaught Error: Uncaught Error: There is no document for file:///home/<user>/theia/examples/browser/package.json

Error: There is no document for file:///home/<user>/theia/examples/browser/package.json
    at LinkProviderAdapter.provideLinks (/home/<user>/theia/packages/plugin-ext/lib/plugin/languages/link-provider.js:31:35)
    at /home/<user>/theia/packages/plugin-ext/lib/plugin/languages.js:332:97
    at LanguagesExtImpl.withAdapter (/home/<user>/theia/packages/plugin-ext/lib/plugin/languages.js:123:20)
    at LanguagesExtImpl.$provideDocumentLinks (/home/<user>/theia/packages/plugin-ext/lib/plugin/languages.js:332:21)
    at /home/<user>/theia/packages/plugin-ext/lib/common/proxy-handler.js:91:71
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
    at async RpcProtocol.handleRequest (/home/<user>/theia/packages/core/lib/common/message-rpc/rpc-protocol.js:167:28) (http://127.0.0.1:3000/vendors-node_modules_theia_monaco-editor-core_esm_vs_base_common_severity_js-node_modules_the-68fc42.js:1785)

         * 
         */
        // fail tests if out of async happens
        fileResourceResolver['shouldOverwrite'] = async () => (assert.fail('should be in sync'), false);
        await deleteWorkspacePreferences();
        console.log('*** launch-preferences:before() - end');
    });

    after(() => {
        console.log('*** launch-preferences:after()');
        fileResourceResolver['shouldOverwrite'] = originalShouldOverwrite;
    });

    /**
     * @typedef {Object} ConfigSuiteOptions
     * @property {any} expectation
     * @property {any} [inspectExpectation]
     * @property {any} [launch]
     * @property {any} [settings]
     * @property {boolean} [only]
     * @property {ConfigMode} [configMode]
     */
    /**
     * @type {(options: ConfigSuiteOptions) => void}
     */
    function testConfigSuite({
        configMode, expectation, inspectExpectation, settings, launch, only
    }) {

        describe(JSON.stringify(configMode, undefined, 2), () => {
            const configPaths = Array.isArray(configMode) ? configMode : [configMode];

            /** @typedef {import('@theia/monaco-editor-core/esm/vs/base/common/lifecycle').IReference<import('@theia/monaco/lib/browser/monaco-editor-model').MonacoEditorModel>} ConfigModelReference */
            /** @type {ConfigModelReference[]} */
            beforeEach(async () => {
                console.log('beforeEach()');
                /** @type {Promise<void>[]} */
                const promises = [];
                /**
                 * @param {string} name
                 * @param {Record<string, unknown>} value
                 */
                const ensureConfigModel = (name, value) => {
                    for (const configPath of configPaths) {
                        promises.push((async () => {
                            try {
                                const uri = rootUri.resolve(configPath + '/' + name + '.json');
                                console.log('*** ensureConfigModel : findProvider() call');
                                const provider = findProvider(uri);
                                if (provider) {
                                    await provider['doSetPreference']('', [], value);
                                } else {
                                    console.log('Unable to find provider for', uri.path.toString());
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        })());
                    }
                };
                if (settings) {
                    ensureConfigModel('settings', settings);
                }
                if (launch) {
                    ensureConfigModel('launch', launch);
                }
                await Promise.all(promises);
            });

            after(() => deleteWorkspacePreferences());

            const testItOnly = !!only ? it.only : it;
            const testIt = testItOnly;

            const settingsLaunch = settings ? settings['launch'] : undefined;

            testIt('get from default', () => {
                const config = preferences.get('launch');
                assert.deepStrictEqual(JSON.parse(JSON.stringify(config)), expectation);
            });

            testIt('get from undefined', () => {
                /** @type {any} */
                const config = preferences.get('launch', undefined, undefined);
                assert.deepStrictEqual(JSON.parse(JSON.stringify(config)), expectation);
            });

            testIt('get from rootUri', () => {
                console.log(`launch-preferences:get from rootUri: enter. rootUri:\n${rootUri.toString()}`);
                /** @type {any} */
                const config = preferences.get('launch', undefined, rootUri.toString());
                console.log(`config:\n` + JSON.stringify(config));
                console.log('vs expected:\n' + JSON.stringify(expectation));
                assert.deepStrictEqual(JSON.parse(JSON.stringify(config)), expectation);
            });

            testIt('inspect in undefined', () => {
                const inspect = preferences.inspect('launch');
                /** @type {PreferenceInspection} */
                let expected = inspectExpectation;
                if (!expected) {
                    expected = {
                        preferenceName: 'launch',
                        defaultValue: defaultLaunch
                    };
                    const workspaceValue = launch || settingsLaunch;
                    if (workspaceValue !== undefined) {
                        Object.assign(expected, { workspaceValue });
                    }
                }
                const expectedValue = expected.workspaceFolderValue || expected.workspaceValue || expected.globalValue || expected.defaultValue;
                assert.deepStrictEqual(JSON.parse(JSON.stringify(inspect)), { ...expected, value: expectedValue });
            });

            testIt('inspect in rootUri', () => {
                const inspect = preferences.inspect('launch', rootUri.toString());
                /** @type {PreferenceInspection} */
                const expected = {
                    preferenceName: 'launch',
                    defaultValue: defaultLaunch
                };
                if (inspectExpectation) {
                    Object.assign(expected, {
                        workspaceValue: inspectExpectation.workspaceValue,
                        workspaceFolderValue: inspectExpectation.workspaceValue
                    });
                } else {
                    const value = launch || settingsLaunch;
                    if (value !== undefined) {
                        Object.assign(expected, {
                            workspaceValue: value,
                            workspaceFolderValue: value
                        });
                    }
                }
                const expectedValue = expected.workspaceFolderValue || expected.workspaceValue || expected.globalValue || expected.defaultValue;
                assert.deepStrictEqual(JSON.parse(JSON.stringify(inspect)), { ...expected, value: expectedValue });
            });

            testIt('update launch', async () => {
                console.log('update launch');

                const inspect1 = preferences.inspect('launch');
                console.log('*** pre-inspect before updating launch:\n' + JSON.stringify(inspect1));

                console.log('validLaunch:\n' + JSON.stringify(validLaunch));
                await preferences.set('launch', validLaunch);

                const inspect = preferences.inspect('launch');
                console.log('inspect:\n' + JSON.stringify(inspect));

                const actual = inspect && inspect.workspaceValue;
                console.log('actual:\n' + JSON.stringify(actual));

                const expected = settingsLaunch && !Array.isArray(settingsLaunch) ? { ...settingsLaunch, ...validLaunch } : validLaunch;
                console.log('expected:\n' + JSON.stringify(expected));

                assert.deepStrictEqual(actual, expected);
            });

            testIt('update launch Workspace', async () => {
                await preferences.set('launch', validLaunch, PreferenceScope.Workspace);

                const inspect = preferences.inspect('launch');
                const actual = inspect && inspect.workspaceValue;
                const expected = settingsLaunch && !Array.isArray(settingsLaunch) ? { ...settingsLaunch, ...validLaunch } : validLaunch;
                assert.deepStrictEqual(actual, expected);
            });

            testIt('update launch WorkspaceFolder', async () => {
                try {
                    await preferences.set('launch', validLaunch, PreferenceScope.Folder);
                    assert.fail('should not be possible to update Workspace Folder Without resource');
                } catch (e) {
                    assert.deepStrictEqual(e.message, 'Unable to write to Folder Settings because no resource is provided.');
                }
            });

            testIt('update launch WorkspaceFolder with resource', async () => {
                await preferences.set('launch', validLaunch, PreferenceScope.Folder, rootUri.toString());

                const inspect = preferences.inspect('launch');
                const actual = inspect && inspect.workspaceValue;
                const expected = settingsLaunch && !Array.isArray(settingsLaunch) ? { ...settingsLaunch, ...validLaunch } : validLaunch;
                assert.deepStrictEqual(actual, expected);
            });

            if ((launch && !Array.isArray(launch)) || (settingsLaunch && !Array.isArray(settingsLaunch))) {
                testIt('update launch.configurations', async () => {
                    await preferences.set('launch.configurations', [validConfiguration, validConfiguration2]);

                    const inspect = preferences.inspect('launch');
                    const actual = inspect && inspect.workspaceValue && inspect.workspaceValue.configurations;
                    assert.deepStrictEqual(actual, [validConfiguration, validConfiguration2]);
                });
            }

            testIt('delete launch', async () => {
                await preferences.set('launch', undefined);
                const actual = preferences.inspect('launch');

                let expected = undefined;
                if (configPaths[1]) {
                    expected = launch;
                    if (Array.isArray(expected)) {
                        expected = { ...expected };
                    }
                    if (expected && !expected.configurations && settingsLaunch && settingsLaunch.configurations !== undefined) {
                        expected.configurations = settingsLaunch.configurations;
                    }
                }
                expected = expected || settingsLaunch;
                console.log('**_**_**_** \nactual: ' + JSON.stringify(actual && actual.workspaceValue) + '\nexpected: ' + JSON.stringify(expected));
                assert.deepStrictEqual(actual && actual.workspaceValue, expected, '\nactual: ' + JSON.stringify(actual && actual.workspaceValue) + '\nexpected: ' + JSON.stringify(expected));
            });

            if ((launch && !Array.isArray(launch)) || (settingsLaunch && !Array.isArray(settingsLaunch))) {
                testIt('delete launch.configurations', async () => {
                    await preferences.set('launch.configurations', undefined);

                    const actual = preferences.inspect('launch');
                    const actualWorkspaceValue = actual && actual.workspaceValue;
                    let  actual_ws = "";
                    if (actual && actual.workspaceValue) {
                        actual_ws= JSON.stringify(actual.workspaceValue);
                    }
                    console.log('++++++++++++ actualWorkspaceValue = actual && actual.workspaceValue : \n+++ actual: ' + JSON.stringify(actual) + '\n+++ actual.workspaceValue: ' + actual_ws);

                    let expected = undefined;
                    if (launch) {
                        expected = { ...launch };
                        delete expected['configurations'];
                    }
                    if (settings) {
                        let _settingsLaunch = undefined;
                        if (typeof settingsLaunch === 'object' && !Array.isArray(settings['launch']) && settings['launch'] !== null) {
                            _settingsLaunch = settingsLaunch;
                        } else {
                            _settingsLaunch = expectation;
                        }
                        if (expected) {
                            if (_settingsLaunch.configurations !== undefined) {
                                expected.configurations = _settingsLaunch.configurations;
                            }
                        } else {
                            expected = _settingsLaunch;
                        }
                    }
                    console.log('**_**_**_** \nactual: ' + JSON.stringify(actualWorkspaceValue) + '\nexpected: ' + JSON.stringify(expected));
                    assert.deepStrictEqual(actualWorkspaceValue, expected);
                });
            }

        });

    }

});
