import React from 'react';
import { Composition } from 'remotion';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/noto-serif-kr/400.css';
import '@fontsource/noto-serif-kr/500.css';
import { Editorial } from './Editorial';
import { LookA, LookB, LookC } from './Looks';
import { plan, FPS, Props } from './plan';
import { sample } from './sample';


export const Root: React.FC = () => (
  <>
  <Composition id="LookA" component={LookA} fps={FPS} width={1920} height={1080} durationInFrames={450} />
  <Composition id="LookB" component={LookB} fps={FPS} width={1920} height={1080} durationInFrames={450} />
  <Composition id="LookC" component={LookC} fps={FPS} width={1920} height={1080} durationInFrames={450} />
  <Composition
    id="Editorial"
    component={Editorial as any}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={plan(sample).total}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({ durationInFrames: plan(props as Props).total })}
  />
  </>
);
