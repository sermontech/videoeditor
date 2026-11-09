import React from 'react';
import {registerRoot, Composition, AbsoluteFill} from 'remotion';
const Card = () => <AbsoluteFill style={{backgroundColor:'#14213d',color:'white',justifyContent:'center',alignItems:'center',fontSize:30}}>AI Video Editor ready</AbsoluteFill>;
registerRoot(() => <Composition id="SmokeTest" component={Card} durationInFrames={24} fps={24} width={320} height={180}/>);
