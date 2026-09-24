import { useState } from 'react';
import Tabs3D, { Tab3DColor, Tab3DItem } from './Tabs3D';
import ManageAssessmentsPanel from './ManageAssessmentsPanel';
import { TRACK_LABELS, TRAINING_TRACKS, categoriesForTrack } from '../lib/trainingTracks';
import { TRAINING_CATEGORIES } from '../lib/trainingCategories';
import { LearningTrack } from '../types';

const SUBTRACK_COLOR: Record<LearningTrack, Tab3DColor> = {
  MANDATORY: 'indigo',
  IAM_ENGINEERING: 'emerald',
  DEVOPS_ENGINEERING: 'amber',
};

// Master Data's Assessments tab — the question bank behind every Learning
// Center assessment, managed from the same place as the Training Catalog
// those courses/tracks live in. Mandatory Training is one track-wide
// assessment; IAM Engineering and DevOps Engineering have one assessment
// per course. This is pure content authoring (add/edit/delete questions) —
// no employee-facing "take assessment" or results view here; those stay on
// Learning Center's own Assessments tab, which shares the same
// ManageAssessmentsPanel so there's exactly one place this logic lives.
export default function MasterDataAssessmentsManager({ searchQuery }: { searchQuery?: string }) {
  const [track, setTrack] = useState<LearningTrack>('MANDATORY');
  const categories = categoriesForTrack(track, TRAINING_CATEGORIES);
  const tabs: Tab3DItem<LearningTrack>[] = TRAINING_TRACKS.map((t) => ({
    key: t,
    label: TRACK_LABELS[t],
    color: SUBTRACK_COLOR[t],
  }));

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Add, edit, or delete the multiple-choice questions behind each track's assessment. Mandatory Training is one
        assessment covering every course in the track; IAM Engineering and DevOps Engineering have one assessment per
        course — expand a course below to author it.
      </p>
      <Tabs3D tabs={tabs} active={track} onChange={setTrack} />
      <ManageAssessmentsPanel track={track} categories={categories} searchQuery={searchQuery} />
    </div>
  );
}
