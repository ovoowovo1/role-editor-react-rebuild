import { Container } from 'pixi.js';
import type { BodyPartTab, PartOption, RoleDocument } from '../../types/role';
import { getBodyPartOption } from '../../mock/options';
import {
  actorAtlasFrames,
  actorRuntimeManifest,
  gafSources
} from '../../mock/gafManifest';
import { ACTOR_BODY_SCALE } from '../../lib/runtime/actorClipAdapter';
import { ActorClip } from '../../lib/runtime/actorClip';
import { createActorGafClip, type GafMovieClip } from '../../lib/runtime/gafMovieClip';
import { actorPartRuntime, getPartFrame, isRuntimeEmptyFrame, sanitizePartScale } from '../../lib/runtime/twlibPartRuntime';
import { displayTransformPatchForHeadLayer } from '../../lib/stage/characterStageHelpers';
import { applyDisplayTransform } from './pixiVisuals';

function getRolePartFrame(role: RoleDocument, category: BodyPartTab, option: PartOption | undefined): number {
  return role.partFrames?.[category] ?? getPartFrame(option) ?? actorPartRuntime[category].defaultFrame;
}

function getRolePartScale(role: RoleDocument, category: BodyPartTab): number {
  return sanitizePartScale(role.partScales?.[category], 1);
}

export function prepareDisguiseRoot(
  role: RoleDocument,
  failedTextures: Set<string>
): { disguiseRoot: Container; headLayerClip: GafMovieClip } {
  const disguiseRoot = new Container();

  const headLibrary = actorPartRuntime.head.library;
  const headLayerClip = createActorGafClip(
    failedTextures,
    headLibrary,
    actorRuntimeManifest,
    gafSources.actorTexture,
    actorAtlasFrames[headLibrary] ?? []
  );
  const headOption = getBodyPartOption('head', role.parts.head);
  const headFrame = getRolePartFrame(role, 'head', headOption);
  headLayerClip.gotoAndStop(headFrame);

  const headLayer = role.headLayer ?? {
    x: 0,
    y: 0,
    scaleX: getRolePartScale(role, 'head'),
    scaleY: getRolePartScale(role, 'head'),
    rotation: 0,
    visible: true,
    opacity: 1
  };
  applyDisplayTransform(headLayerClip, displayTransformPatchForHeadLayer(headLayer, isRuntimeEmptyFrame('head', headFrame)));

  return { disguiseRoot, headLayerClip };
}

export function applyHeadLayerDisplayTransform(headLayerClip: GafMovieClip, role: RoleDocument): void {
  const headLayer = role.headLayer ?? {
    x: 0,
    y: 0,
    scaleX: getRolePartScale(role, 'head'),
    scaleY: getRolePartScale(role, 'head'),
    rotation: 0,
    visible: true,
    opacity: 1
  };
  const headOption = getBodyPartOption('head', role.parts.head);
  const headFrame = getRolePartFrame(role, 'head', headOption);

  applyDisplayTransform(headLayerClip, displayTransformPatchForHeadLayer(headLayer, isRuntimeEmptyFrame('head', headFrame)));
}

export function buildActorClipForRole(role: RoleDocument, failedTextures: Set<string>, bodyAnimationLabel: string): ActorClip {
  const actorClip = new ActorClip(failedTextures, bodyAnimationLabel);

  const handOption = getBodyPartOption('hand', role.parts.hand);
  const footOption = getBodyPartOption('foot', role.parts.foot);
  const capeOption = getBodyPartOption('cape', role.parts.cape);
  const headOption = getBodyPartOption('head', role.parts.head);

  const handFrame = getRolePartFrame(role, 'hand', handOption);
  const footFrame = getRolePartFrame(role, 'foot', footOption);
  const capeFrame = getRolePartFrame(role, 'cape', capeOption);
  const headFrame = getRolePartFrame(role, 'head', headOption);

  actorClip.footContainer.scale.set(getRolePartScale(role, 'foot'));
  actorClip.rightFoot.setFrame(footFrame);
  actorClip.leftFoot.setFrame(footFrame);
  if (isRuntimeEmptyFrame('foot', footFrame)) {
    actorClip.rightFoot.clip.visible = false;
    actorClip.leftFoot.clip.visible = false;
  }

  const handScale = getRolePartScale(role, 'hand');
  actorClip.rightHand.setFrame(handFrame, handScale);
  actorClip.leftHand.setFrame(handFrame, handScale);
  if (isRuntimeEmptyFrame('hand', handFrame)) {
    actorClip.rightHand.clip.visible = false;
    actorClip.leftHand.clip.visible = false;
  }

  actorClip.capeClip.setFrame(capeFrame, getRolePartScale(role, 'cape'));
  if (isRuntimeEmptyFrame('cape', capeFrame)) {
    actorClip.capeClip.clip.visible = false;
  }

  actorClip.headClip.setFrame(headFrame, getRolePartScale(role, 'head'));

  return actorClip;
}

export { ACTOR_BODY_SCALE };
