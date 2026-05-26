/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { LOGS_ONBOARDING_FEEDBACK_LINK } from '@kbn/observability-shared-plugin/common';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { type AppMountParameters } from '@kbn/core-application-browser';
import { type ObservabilityOnboardingAppServices } from '../..';
import { useActiveVersion, versionStore } from '../version_switcher_widget';
import type { IngestHubVersion } from '../version_switcher_widget';
import { PLUGIN_ID } from '../../../common';

interface Props {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}

const VERSION_OPTIONS: Array<{
  value: IngestHubVersion;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
  disabled?: boolean;
}> = [
  {
    value: 'current',
    inputDisplay: 'Current',
    dropdownDisplay: <strong>Current — Karolina&apos;s canvas</strong>,
  },
  {
    value: '__christianGroup' as IngestHubVersion,
    inputDisplay: '',
    disabled: true,
    dropdownDisplay: (
      <span style={{ fontSize: '0.75em', textTransform: 'uppercase', color: '#69707D' }}>
        — Christian&apos;s versions —
      </span>
    ),
  },
  { value: 'version1', inputDisplay: 'V1', dropdownDisplay: <strong>Christian — V1</strong> },
  { value: 'version2', inputDisplay: 'V2', dropdownDisplay: <strong>Christian — V2</strong> },
  { value: 'version3', inputDisplay: 'V3', dropdownDisplay: <strong>Christian — V3</strong> },
  {
    value: 'streamsUx',
    inputDisplay: 'Streams',
    dropdownDisplay: <strong>Christian — Streams</strong>,
  },
  {
    value: 'agentUx',
    inputDisplay: 'Agent',
    dropdownDisplay: <strong>Christian — Agent</strong>,
  },
  {
    value: 'aiSourceMap',
    inputDisplay: 'AI SourceMap',
    dropdownDisplay: <strong>Christian — AI SourceMap</strong>,
  },
];

function VersionSwitcher({
  navigateToApp,
}: {
  navigateToApp?: (appId: string, options?: { path?: string }) => Promise<void>;
}) {
  const [active, setActive] = useActiveVersion();

  const applyVersion = React.useCallback(
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
      options={VERSION_OPTIONS}
      valueOfSelected={active}
      onChange={applyVersion}
      compressed
      hasDividers
      aria-label="Prototype version"
      popoverProps={{ panelMinWidth: 260 }}
      style={{ minWidth: 130 }}
    />
  );
}

export function ObservabilityOnboardingHeaderActionMenu({ setHeaderActionMenu, theme$ }: Props) {
  const {
    services: { context, notifications, application },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const location = useLocation();
  const normalizedPathname = location.pathname.replace(/\/$/, '');
  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  const isIngestHubPage = normalizedPathname.startsWith('/ingest-hub');

  const FEEDBACK_FLOW_PATHS = [
    '/auto-detect',
    '/kubernetes',
    '/otel-kubernetes',
    '/otel-logs',
    '/firehose',
    '/otel-apm',
    '/cloudforwarder',
  ];
  const isFlowPage = FEEDBACK_FLOW_PATHS.some((p) => normalizedPathname.startsWith(p));

  const feedbackButtonLabel = i18n.translate('xpack.observability_onboarding.header.feedback', {
    defaultMessage: 'Give feedback',
  });

  if (isIngestHubPage) {
    return (
      <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
        <VersionSwitcher navigateToApp={application?.navigateToApp} />
      </HeaderMenuPortal>
    );
  }

  if (!context.isServerless && isFlowPage && isFeedbackEnabled) {
    return (
      <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
        <EuiButtonEmpty
          data-test-subj="observabilityOnboardingPageGiveFeedback"
          aria-label={feedbackButtonLabel}
          href={LOGS_ONBOARDING_FEEDBACK_LINK}
          size="s"
          iconType="popout"
          iconSide="right"
          target="_blank"
          color="primary"
        >
          {feedbackButtonLabel}
        </EuiButtonEmpty>
      </HeaderMenuPortal>
    );
  }

  return null;
}
