import React from 'react';
import {createRoot} from 'react-dom/client';
import {TeamApp} from './TeamApp';
import './team.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><TeamApp /></React.StrictMode>);
