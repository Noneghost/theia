// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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

import { injectable, interfaces } from 'inversify';
import { ContributionFilterRegistry } from './contribution-filter';
import { collectRecursive, getAllNamedOptional, getOptional } from './inversify-utils';
import { Proxyable } from './proxy';
import { serviceIdentifier } from './types';

/**
 * Represents the `serviceId` string referencing a given service type `T`.
 */
export type ServicePath<T> = string & { __staticType: T };
export function servicePath<T>(path: string): ServicePath<T> {
    // @ts-expect-error
    return path;
}

/**
 * Part of Theia's Service Layer.
 *
 * Whenever a remote wants to use a service over RPC, a request will go through the `ServiceProvider` to find the instance to proxy.
 */
export const ServiceProvider = serviceIdentifier<ServiceProvider>('ServiceProvider');
export interface ServiceProvider {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getService<T extends object>(serviceId: string | ServicePath<T>, params?: any): T | undefined;
}

export function bindServiceProvider(bind: interfaces.Bind, contributionName: string | number | symbol): void {
    bind(ServiceProvider)
        .toDynamicValue(ctx => {
            const contributionFilter = getOptional(ctx.container, ContributionFilterRegistry);
            const contributions = collectRecursive(ctx.container, container => getAllNamedOptional(container, ServiceContribution, contributionName));
            return new DefaultServiceProvider(contributionFilter?.applyFilters(contributions, ServiceContribution) ?? contributions);
        })
        .inSingletonScope()
        .whenTargetNamed(contributionName);
}

/**
 * Part of Theia's Service Layer.
 *
 * Requested services to offer over RPC are fetched through a `ServiceProvider` that will source from `ServiceContribution` bindings.
 *
 * ## Usage Examples
 *
 * ### Record
 *
 * ```ts
 * bind(ServiceContribution)
 *     .toDynamicValue(ctx => ({
 *         [PATH1]: () => ctx.container.get(Service1),
 *         [PATH2]: () => ctx.container.get(Service2),
 *         [PATH3]: params => ctx.container.get(params.yourParam ? Service3 : Service4);
 *         // ...
 *     }))
 *     .inSingletonScope()
 *     .whenTargetNamed(YourServiceNamespace);
 * ```
 *
 * ### Function
 *
 * ```ts
 * bind(ServiceContribution)
 *     .toDynamicValue(ctx => (serviceId, params) => {
 *         // process arguments...
 *         return resolvedServiceOrUndefined;
 *     }))
 *     .inSingletonScope()
 *     .whenTargetNamed(YourServiceNamespace);
 * ```
 */
export const ServiceContribution = serviceIdentifier<ServiceContribution>('ServiceContribution');
export type ServiceContribution = ServiceContributionFunction | ServiceContributionRecord;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceContributionFunction = (serviceId: string, params?: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ServiceContributionRecord { [serviceId: string]: (params?: any) => any };

/**
 * @internal
 *
 * This implementation dispatches a service request to its service contributions.
 */
@injectable()
export class DefaultServiceProvider implements ServiceProvider {

    constructor(
        protected serviceContributions: ServiceContribution[]
    ) { }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getService<T extends object>(serviceId: string, params?: any): T | undefined {
        for (const contribution of this.serviceContributions) {
            try {
                let service: Proxyable | undefined;
                if (typeof contribution === 'function') {
                    service = contribution(serviceId, params);
                } else if (typeof contribution === 'object' && !Array.isArray(contribution)) {
                    service = contribution[serviceId]?.(params);
                } else {
                    console.error(`unexpected contribution type: ${typeof contribution}`);
                    continue;
                }
                if (service) {
                    return service as T;
                }
            } catch (error) {
                console.error(error);
            }
        }
        throw new Error(`no service found for "${serviceId}"`);
    }
}