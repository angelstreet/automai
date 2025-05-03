import { getTranslations } from 'next-intl/server';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { EnvironmentVariablesContent } from './EnvironmentVariablesContent';

export default async function EnvironmentVariablesPage() {
  const t = await getTranslations('environmentVariables');

  const user = await getUser();

  // Get user's active team
  const activeTeam = user?.id ? (await getUserActiveTeam(user.id)) || null : null;

  return (
    <FeaturePageContainer title={t('title')} description={t('desc')}>
      {activeTeam && <EnvironmentVariablesContent teamId={activeTeam.id} />}
    </FeaturePageContainer>
  );
}
