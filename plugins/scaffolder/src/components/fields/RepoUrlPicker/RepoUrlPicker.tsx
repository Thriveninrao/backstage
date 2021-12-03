/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  Progress,
  Select,
  SelectedItems,
  SelectItem,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  scmIntegrationsApiRef,
  scmAuthApiRef,
} from '@backstage/integration-react';
import React, { useCallback, useEffect } from 'react';
import { FieldProps } from '@rjsf/core';
import { scaffolderApiRef } from '../../../api';
import { useAsync } from 'react-use';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import { useSecretsContext } from '../../secrets';

function splitFormData(url: string | undefined, allowedOwners?: string[]) {
  let host = undefined;
  let owner = undefined;
  let repo = undefined;
  let organization = undefined;
  let workspace = undefined;
  let project = undefined;

  try {
    if (url) {
      const parsed = new URL(`https://${url}`);
      host = parsed.host;
      owner = parsed.searchParams.get('owner') || allowedOwners?.[0];
      repo = parsed.searchParams.get('repo') || undefined;
      // This is azure dev ops specific. not used for any other provider.
      organization = parsed.searchParams.get('organization') || undefined;
      // These are bitbucket specific, not used for any other provider.
      workspace = parsed.searchParams.get('workspace') || undefined;
      project = parsed.searchParams.get('project') || undefined;
    }
  } catch {
    /* ok */
  }

  return { host, owner, repo, organization, workspace, project };
}

function serializeFormData(data: {
  host?: string;
  owner?: string;
  repo?: string;
  organization?: string;
  workspace?: string;
  project?: string;
}) {
  if (!data.host) {
    return undefined;
  }

  const params = new URLSearchParams();
  if (data.owner) {
    params.set('owner', data.owner);
  }
  if (data.repo) {
    params.set('repo', data.repo);
  }
  if (data.organization) {
    params.set('organization', data.organization);
  }
  if (data.workspace) {
    params.set('workspace', data.workspace);
  }
  if (data.project) {
    params.set('project', data.project);
  }

  return `${data.host}?${params.toString()}`;
}

export const RepoUrlPicker = ({
  onChange,
  uiSchema,
  rawErrors,
  formData,
}: FieldProps<string>) => {
  const scaffolderApi = useApi(scaffolderApiRef);
  const integrationApi = useApi(scmIntegrationsApiRef);
  const { setSecret } = useSecretsContext();
  const scmAuthApi = useApi(scmAuthApiRef);

  const allowedHosts = uiSchema['ui:options']?.allowedHosts as string[];
  const allowedOwners = uiSchema['ui:options']?.allowedOwners as string[];

  const { value: integrations, loading } = useAsync(async () => {
    return await scaffolderApi.getIntegrationsList({ allowedHosts });
  });

  const { host, owner, repo, organization, workspace, project } = splitFormData(
    formData,
    allowedOwners,
  );

  const onBlur = useCallback(() => {
    const withCredentials = uiSchema['ui:options']?.withCredentials as {
      key: string;
    };

    const check = async () => {
      if (withCredentials) {
        if (host && owner && repo) {
          const token = await scmAuthApi.getCredentials({
            url: `https://${host}/${owner}/${repo}`,
          });

          setSecret({ [withCredentials.key]: token.token });
        }
      }
    };
    check();
  }, [host, owner, repo, scmAuthApi, setSecret, uiSchema]);

  const updateHost = useCallback(
    (value: SelectedItems) => {
      onChange(
        serializeFormData({
          host: value as string,
          owner,
          repo,
          organization,
          workspace,
          project,
        }),
      );

      onBlur();
    },
    [onChange, owner, repo, organization, workspace, project, onBlur],
  );

  const updateOwnerSelect = useCallback(
    (value: SelectedItems) =>
      onChange(
        serializeFormData({
          host,
          owner: value as string,
          repo,
          organization,
          workspace,
          project,
        }),
      ),
    [onChange, host, repo, organization, workspace, project],
  );

  const updateOwner = useCallback(
    (evt: React.ChangeEvent<{ name?: string; value: unknown }>) =>
      onChange(
        serializeFormData({
          host,
          owner: evt.target.value as string,
          repo,
          organization,
          workspace,
          project,
        }),
      ),
    [onChange, host, repo, organization, workspace, project],
  );

  const updateRepo = useCallback(
    (evt: React.ChangeEvent<{ name?: string; value: unknown }>) =>
      onChange(
        serializeFormData({
          host,
          owner,
          repo: evt.target.value as string,
          organization,
          workspace,
          project,
        }),
      ),
    [onChange, host, owner, organization, workspace, project],
  );

  const updateOrganization = useCallback(
    (evt: React.ChangeEvent<{ name?: string; value: unknown }>) =>
      onChange(
        serializeFormData({
          host,
          owner,
          repo,
          organization: evt.target.value as string,
          workspace,
          project,
        }),
      ),
    [onChange, host, owner, repo, workspace, project],
  );

  const updateWorkspace = useCallback(
    (evt: React.ChangeEvent<{ name?: string; value: unknown }>) =>
      onChange(
        serializeFormData({
          host,
          owner,
          repo,
          organization,
          workspace: evt.target.value as string,
          project,
        }),
      ),
    [onChange, host, owner, repo, organization, project],
  );

  const updateProject = useCallback(
    (evt: React.ChangeEvent<{ name?: string; value: unknown }>) =>
      onChange(
        serializeFormData({
          host,
          owner,
          repo,
          organization,
          workspace,
          project: evt.target.value as string,
        }),
      ),
    [onChange, host, owner, repo, organization, workspace],
  );

  useEffect(() => {
    if (host === undefined && integrations?.length) {
      onChange(
        serializeFormData({
          host: integrations[0].host,
          owner,
          repo,
          organization,
          workspace,
          project,
        }),
      );
    }
  }, [
    onChange,
    integrations,
    host,
    owner,
    repo,
    organization,
    workspace,
    project,
  ]);

  if (loading) {
    return <Progress />;
  }

  const hostsOptions: SelectItem[] = integrations
    ? integrations
        .filter(i => allowedHosts?.includes(i.host))
        .map(i => ({ label: i.title, value: i.host }))
    : [{ label: 'Loading...', value: 'loading' }];

  const ownersOptions: SelectItem[] = allowedOwners
    ? allowedOwners.map(i => ({ label: i, value: i }))
    : [{ label: 'Loading...', value: 'loading' }];

  return (
    <>
      <FormControl
        margin="normal"
        required
        error={rawErrors?.length > 0 && !host}
      >
        <Select
          native
          disabled={hostsOptions.length === 1}
          label="Host"
          onChange={updateHost}
          selected={host}
          items={hostsOptions}
        />

        <FormHelperText>
          The host where the repository will be created
        </FormHelperText>
      </FormControl>
      {/* Show this for dev.azure.com only */}
      {host === 'dev.azure.com' && (
        <FormControl
          margin="normal"
          required
          error={rawErrors?.length > 0 && !organization}
        >
          <InputLabel htmlFor="repoInput">Organization</InputLabel>
          <Input
            id="repoInput"
            onChange={updateOrganization}
            value={organization}
          />
          <FormHelperText>The name of the organization</FormHelperText>
        </FormControl>
      )}
      {host && integrationApi.byHost(host)?.type === 'bitbucket' && (
        <>
          {/* Show this for bitbucket.org only */}
          {host === 'bitbucket.org' && (
            <FormControl
              margin="normal"
              required
              error={rawErrors?.length > 0 && !workspace}
            >
              <InputLabel htmlFor="wokrspaceInput">Workspace</InputLabel>
              <Input
                id="wokrspaceInput"
                onChange={updateWorkspace}
                value={workspace}
              />
              <FormHelperText>
                The workspace where the repository will be created
              </FormHelperText>
            </FormControl>
          )}
          <FormControl
            margin="normal"
            required
            error={rawErrors?.length > 0 && !project}
          >
            <InputLabel htmlFor="wokrspaceInput">Project</InputLabel>
            <Input
              id="wokrspaceInput"
              onChange={updateProject}
              value={project}
            />
            <FormHelperText>
              The project where the repository will be created
            </FormHelperText>
          </FormControl>
        </>
      )}
      {/* Show this for all hosts except bitbucket */}
      {host &&
        integrationApi.byHost(host)?.type !== 'bitbucket' &&
        !allowedOwners && (
          <>
            <FormControl
              margin="normal"
              required
              error={rawErrors?.length > 0 && !owner}
            >
              <InputLabel htmlFor="ownerInput">Owner</InputLabel>
              <Input id="ownerInput" onChange={updateOwner} value={owner} />
              <FormHelperText>
                The organization, user or project that this repo will belong to
              </FormHelperText>
            </FormControl>
          </>
        )}
      {/* Show this for all hosts except bitbucket where allowed owner is set */}
      {host &&
        integrationApi.byHost(host)?.type !== 'bitbucket' &&
        allowedOwners && (
          <>
            <FormControl
              margin="normal"
              required
              error={rawErrors?.length > 0 && !owner}
            >
              <Select
                native
                label="Owner Available"
                onChange={updateOwnerSelect}
                disabled={ownersOptions.length === 1}
                selected={owner}
                items={ownersOptions}
              />

              <FormHelperText>
                The organization, user or project that this repo will belong to
              </FormHelperText>
            </FormControl>
          </>
        )}
      {/* Show this for all hosts */}
      <FormControl
        margin="normal"
        required
        error={rawErrors?.length > 0 && !repo}
      >
        <InputLabel htmlFor="repoInput">Repository</InputLabel>
        <Input
          id="repoInput"
          onChange={updateRepo}
          value={repo}
          onBlur={onBlur}
        />
        <FormHelperText>The name of the repository</FormHelperText>
      </FormControl>
    </>
  );
};
