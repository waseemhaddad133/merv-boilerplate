
import React       from 'react';

import POST        from './post'

import packageJSON from '../package.json'

import { connect } from 'react-redux'
import { Route }   from 'react-router-dom'

const appName   = packageJSON.name;
const providers = packageJSON.authProviders;

// From the application state perspective
//  the auth state will be in
//  - { auth:{...here...} }
// because we will be using [combineReducers] in index.js

const defaults = {
  verified:false, // the auth token was confirmed valid by the server
  progress:false, // the current auth-action being executed (check,signin,signup,...)
  user:false,     // the user information we got from the
  token:false     // the JWT token
};

// Save and Load functions for localStorage, this time we dont want to
// store the whole state, but instead pick jsut the important values

// Just save the token and user
const save = state =>
  localStorage.setItem(`${appName}-auth`,JSON.stringify({
    token: state.token,
    user:  state.user
}));

// This loads out auth state from localStorage
//  - if localStorage has a record, this will be JSON.parsed
//  - if NOT, '{}' will return an enmpty object
//  - for the return the order of ...splashes is important
//    we take defaults first, and then try to overwrite with the
//    loaded state
const load = () => {
  const loaded = JSON.parse( localStorage.getItem(`${appName}-auth`)||'{}' )
  return { ...defaults, ...loaded };
}

const preloadedState = load();

/*
  The reducer handles all the stateful changes of authentication
    - for auth:login it does the redirect to the backend
      this could be done in the action as well
      but keeping it here makes the reader aware of the fact
      that in this 'state' we're doing redirect
*/

export const authReducer = function( state = preloadedState, action ){
  switch (action.type) {
    case "auth:login":
      window.location = `${packageJSON.backend}/auth/${action.provider}`;
      break;
    case "auth:logout":
      state = { ...state, user:false, token:false, verified:false };
      break;
    case "auth:check":
      state = { ...state, progress:'checking' };
      break;
    case "auth:fail":
      state = {
        ...state,
        user:false, token:false, error:action.error, progress:false, verified:false
      };
      POST.token = false;
      break;
    case "auth:ok":
      state = { ...state, progress:false, token:action.token, verified:true };
      POST.token = action.token;
      break;
    default:
  }
  save(state);
  return state;
}

export const authActions = function( dispatch ){
  return { auth : {
    login: async function(provider){
      dispatch({ type:'auth:login', provider })
    },
    ok: async function(token){
      dispatch({ type:'auth:ok', token })
    },
    check: async function(token){
      dispatch({ type:'auth:check', token });
      POST.token = token; // In order to try the token we need to add it to POST
      const result = await POST('/auth/check');
      if ( result.success ){
        dispatch({ type:'auth:ok', token });
      } else {
        dispatch({ type:'auth:fail', error:result.message });
      }
    },
    fail: async function(error){
      dispatch({ type:'auth:fail', error })
    },
    logout: async function(){
      dispatch({ type:'auth:logout' })
    }
}}}

const AuthSuccess = connect( null, authActions )(
  function AuthSuccess(props){
    const { auth } = props;
    const token = props.match.params.token;
    auth.ok(token);
    props.history.push('/');
    return null;
  }
)

let checkedForTokenAlready = false;

const AuthCheck = connect( null, authActions )(
  function AuthCheck({ auth }){
    if ( checkedForTokenAlready ) return null;
    if ( preloadedState.token   ) auth.check( preloadedState.token );
    checkedForTokenAlready = true;
    return null;
  }
)

export function Auth(){
  return ( <>
    <AuthCheck/>
    <Route path="/success/:token" component={AuthSuccess}/>
  </> )
}

export function AuthLinks(){
  return providers.map(
    provider =>
      <div key={provider}>
        <a href={`${packageJSON.backend}/auth/${provider}`}>
          Login with {provider}
        </a>
      </div>
  )
}
