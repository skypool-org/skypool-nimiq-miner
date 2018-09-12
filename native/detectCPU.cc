#include <node.h>
#include "cpuid.h"
namespace demo {

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;

void Method(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  CPUID cpuID1(7); // Get CPU vendor
  uint32_t n1 = cpuID1.EBX();
  #ifdef linux
  if ((n1 >> 16 & 1) == 1) {
      args.GetReturnValue().Set(String::NewFromUtf8(isolate, "extreme"));
      return;
  }
  #endif
  if ((n1 >> 5 & 1) == 1) {
    args.GetReturnValue().Set(String::NewFromUtf8(isolate, "fast"));
    return;
  }
  CPUID cpuID2(1); // Get CPU vendor
  uint32_t n2 = cpuID2.ECX();
  if ((n2 >> 28 & 1) == 1) {
    args.GetReturnValue().Set(String::NewFromUtf8(isolate, "normal"));
    return;
  }
  args.GetReturnValue().Set(String::NewFromUtf8(isolate, "compat"));
}

void Initialize(Local<Object> exports) {
  NODE_SET_METHOD(exports, "detectCPU", Method);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

}
