import { LocalCollection } from '@/core/data/local-collection';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { CollectionRepository } from '@/features/knowledge/data/collection-repository';
import { CompositeCollectionRepository } from '@/features/knowledge/data/composite-collection-repository';
import { GuestCollectionRepository } from '@/features/knowledge/data/guest-collection-repository';
import type { StarStory, StarStoryInput } from '../domain/types';
import { buildLocalStory } from './mappers';
import { SupabaseStoryRepository } from './supabase-story-repository';

export type StoryRepository = CollectionRepository<StarStory, StarStoryInput>;

export function createStoryRepository(
  client: TypedSupabaseClient | null,
): StoryRepository {
  const guest = new GuestCollectionRepository<StarStory, StarStoryInput>(
    new LocalCollection('interviewforge.guest.star_stories'),
    buildLocalStory,
  );
  const cloud = client ? new SupabaseStoryRepository(client) : null;
  return new CompositeCollectionRepository(guest, cloud);
}
