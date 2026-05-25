/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiSuperSelect, EuiText } from '@elastic/eui';
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { StreamsAppPublicStart } from '@kbn/streams-app-plugin/public';
import type { ObservabilityOnboardingConfig } from '../server';
import { PLUGIN_ID } from '../common';
import { ObservabilityOnboardingLocatorDefinition } from './locators/onboarding_locator/locator_definition';
import type { ObservabilityOnboardingPluginLocators } from './locators';
import type { ConfigSchema } from '.';
import {
  OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_DATASET_DETECTED_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_WIRED_STREAMS_AUTO_ENABLED_EVENT,
} from '../common/telemetry_events';

import { versionStore } from './application/version_switcher_store';
import type { IngestHubVersion } from './application/version_switcher_store';
const VERSION_OPTIONS = [
  {
    value: 'current' as IngestHubVersion,
    inputDisplay: 'Current',
    dropdownDisplay: (
      <>
        <strong>Current</strong>
        <EuiText size="s" color="subdued">
          <p>Clean canvas — Karolina&apos;s working version. Christian&apos;s reference designs are below.</p>
        </EuiText>
      </>
    ),
  },
  {
    value: '__christianGroup' as IngestHubVersion,
    inputDisplay: '',
    disabled: true,
    dropdownDisplay: (
      <EuiText
        size="xs"
        css={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          paddingBlock: '4px',
          opacity: 0.5,
        }}
      >
        <p>— Old (Christian) —</p>
      </EuiText>
    ),
  },
  {
    value: 'version1' as IngestHubVersion,
    inputDisplay: '-V1',
    dropdownDisplay: (
      <>
        <strong>Christian-V1</strong>
        <EuiText size="s" color="subdued">
          <p>Earlier ingest hub prototype in the onboarding app (before the V2 canvas).</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'version2' as IngestHubVersion,
    inputDisplay: '-V2',
    dropdownDisplay: (
      <>
        <strong>Christian-V2</strong>
        <EuiText size="s" color="subdued">
          <p>
            &ldquo;Everything is a stream&rdquo; canvas vision + AI-assisted onboarding +
            AI-generated integrations + progressive disclosure principles.
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'version3' as IngestHubVersion,
    inputDisplay: '-V3',
    dropdownDisplay: (
      <>
        <strong>Christian-V3</strong>
        <EuiText size="s" color="subdued">
          <p>
            Same as Christian-V2: &ldquo;Everything is a stream&rdquo; canvas + AI-assisted
            onboarding + AI-generated integrations + progressive disclosure principles.
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'streamsUx' as IngestHubVersion,
    inputDisplay: '-Streams',
    dropdownDisplay: (
      <>
        <strong>Streams</strong>
        <EuiText size="s" color="subdued">
          <p>User lands in Kibana and is pushed to add data but can skip the flow.</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'agentUx' as IngestHubVersion,
    inputDisplay: '-Agent',
    dropdownDisplay: (
      <>
        <strong>Agent</strong>
        <EuiText size="s" color="subdued">
          <p>Same as Streams: classic Observability without Add data emphasis.</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'aiSourceMap' as IngestHubVersion,
    inputDisplay: '-AI SourceMap',
    dropdownDisplay: (
      <>
        <strong>AI SourceMap</strong>
        <EuiText size="s" color="subdued">
          <p>User lands in Kibana and is pushed to add data but can skip the flow.</p>
        </EuiText>
      </>
    ),
  },
];

const VersionSwitcherNavControl: React.FC<{
  navigateToApp?: (appId: string, options?: { path?: string }) => Promise<void>;
}> = ({ navigateToApp }) => {
  const [active, setActive] = React.useState<IngestHubVersion>(versionStore.getSnapshot());

  React.useEffect(() => {
    return versionStore.subscribe(() => setActive(versionStore.getSnapshot()));
  }, []);

  const applyIngestHubVersion = React.useCallback(
    (value: IngestHubVersion) => {
      versionStore.setVersion(value);
      sessionStorage.removeItem('ingestHub:showDiscoverTour');
      sessionStorage.removeItem('ingestHub:dataAdded');
      if (value === 'agentUx' || value === 'version2' || value === 'version3') {
        navigateToApp?.('observability-overview');
      } else {
        const path = value === 'blockUx' ? '/ingest-hub/integrations' : '/ingest-hub';
        navigateToApp?.(PLUGIN_ID, { path });
      }
    },
    [navigateToApp]
  );

  return (
    <EuiSuperSelect
      data-test-subj="observabilityOnboardingToolbarVersionSuperSelect"
      options={VERSION_OPTIONS}
      valueOfSelected={active}
      onChange={(value) => applyIngestHubVersion(value)}
      compressed
      hasDividers
      fullWidth={false}
      aria-label="Onboarding experience version"
      popoverProps={{
        panelMinWidth: 320,
      }}
      style={{ minWidth: 160 }}
    />
  );
};

export type ObservabilityOnboardingPluginSetup = void;
export type ObservabilityOnboardingPluginStart = void;

export interface ObservabilityOnboardingPluginSetupDeps {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  discover: DiscoverSetup;
  share: SharePluginSetup;
  fleet: FleetSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface ObservabilityOnboardingPluginStartDeps {
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  discover: DiscoverStart;
  share: SharePluginStart;
  fleet: FleetStart;
  cloud?: CloudStart;
  usageCollection?: UsageCollectionStart;
  streams?: StreamsPluginStart;
  streamsApp?: StreamsAppPublicStart;
}

export type ObservabilityOnboardingContextValue = CoreStart &
  ObservabilityOnboardingPluginStartDeps & { config: ConfigSchema };

export class ObservabilityOnboardingPlugin
  implements Plugin<ObservabilityOnboardingPluginSetup, ObservabilityOnboardingPluginStart>
{
  private locators?: ObservabilityOnboardingPluginLocators;

  constructor(private readonly ctx: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ObservabilityOnboardingPluginSetupDeps) {
    const stackVersion = this.ctx.env.packageInfo.version;
    const config = this.ctx.config.get<ObservabilityOnboardingConfig>();
    const isServerlessBuild = this.ctx.env.packageInfo.buildFlavor === 'serverless';
    const isDevEnvironment = this.ctx.env.mode.dev;
    const pluginSetupDeps = plugins;

    core.application.register({
      id: PLUGIN_ID,
      title: 'Observability Onboarding',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: ['add data'],
      deepLinks: [
        {
          id: 'ingest-hub',
          title: 'Get started',
          path: '/ingest-hub',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-integrations',
          title: 'Add data',
          path: '/ingest-hub/integrations',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-platform-migration',
          title: 'Platform Migration',
          path: '/ingest-hub/platform-migration',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-dashboards',
          title: 'Dashboards',
          path: '/ingest-hub/dashboards',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-rules',
          title: 'Rules & Monitors',
          path: '/ingest-hub/rules',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-data-management',
          title: 'Data management',
          path: '/ingest-hub/data-management',
          visibleIn: [],
        },
      ],
      async mount(appMountParameters: AppMountParameters) {
        // Load application bundle and Get start service
        const [{ renderApp }, [coreStart, corePlugins]] = await Promise.all([
          import('./application/app'),
          core.getStartServices(),
        ]);

        const { createCallApi } = await import('./services/rest/create_call_api');

        createCallApi(core);

        return renderApp({
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          corePlugins: corePlugins as ObservabilityOnboardingPluginStartDeps,
          config,
          context: {
            isDev: isDevEnvironment,
            isCloud: Boolean(pluginSetupDeps.cloud?.isCloudEnabled),
            isServerless: Boolean(pluginSetupDeps.cloud?.isServerlessEnabled) || isServerlessBuild,
            stackVersion,
            cloudServiceProvider: pluginSetupDeps.cloud?.csp,
          },
        });
      },
      visibleIn: ['globalSearch'],
    });

    this.locators = {
      onboarding: plugins.share.url.locators.create(new ObservabilityOnboardingLocatorDefinition()),
    };

    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT);
    core.analytics.registerEventType(
      OBSERVABILITY_ONBOARDING_FLOW_DATASET_DETECTED_TELEMETRY_EVENT
    );
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_WIRED_STREAMS_AUTO_ENABLED_EVENT);

    return {
      locators: this.locators,
      getLocator: () => this.locators?.onboarding,
    };
  }
  public start(core: CoreStart, _plugins: ObservabilityOnboardingPluginStartDeps) {
    core.chrome.navControls.registerRight({
      order: 9000,
      mount: (element) => {
        ReactDOM.render(
          core.rendering.addContext(
            <VersionSwitcherNavControl navigateToApp={core.application.navigateToApp} />
          ),
          element,
          () => {}
        );
        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    return {
      locators: this.locators,
    };
  }
}
