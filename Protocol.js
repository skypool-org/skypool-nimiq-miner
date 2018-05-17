const Protocol = {

  // Client receive from Server
  RegisterBack: 'b',
  RegisterBack_ServerUnable: 'a',
  RegisterBack_ParaFail: 'b',
  RegisterBack_Ok: 'c',
  RegisterBack_Full: 'd',
  RegisterBack_VersionOld: 'e',

  WorkRange: 'w',
  WorkRange_256: 'a',
  WorkRange_Difficult: 'b',

  AssignJob: 'j',
  AssignJob_BlockHeaderBase64: 'a',
  AssignJob_TimeNonce36: 'c',
  AssignJob_CurrentNonce36: 'd',
  AssignJob_Index: 'e',

  PullBack: 'a',
  PullBack_BlockHeaderBase64: 'a',
  PullBack_TimeNonce36: 'c',
  PullBack_CurrentNonce36: 'd',
  PullBack_Index: 'e',

  CloseBanIP: 'i',

  CloseFirewall: 'f',

  Exit: 'e',


  // Client send to Server
  Register: 'r',
  Register_Address: 'a',
  Register_Name: 'n',
  Register_Version: 'v',
  Register_Platform: 'p',
  Register_Threads: 't',

  Pull: 'p',

  Push: 'u',
  Push_TimeNonce36: 'a',
  Push_Nonce: 'b',
  Push_Index: 'c',
};

module.exports = Protocol;
