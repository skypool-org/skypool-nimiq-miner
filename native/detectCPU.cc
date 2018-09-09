#include <node.h>
//#include <immintrin.h>
//#include <avx2intrin.h>
#include <intrin.h>
namespace demo {

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;

void Method(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  try {
    __m256 s1 = _mm256_set_ps(1.0, 3.0, 5.0, 7.0, 9.0, 11.0, 13.0, 15.0);
    __m256 s2 = _mm256_set_ps(2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0);
//    __asm__ ("vpand %2, %1, %0" : "=x"(result) : "x"(s1), "xm"(s2) );
    args.GetReturnValue().Set(String::NewFromUtf8(isolate, "fast"));
  } catch( const char* msg ) {
    try {
      __m128 test2 = _mm_set_ps(0,1,2,3);
      args.GetReturnValue().Set(String::NewFromUtf8(isolate, "normal"));
    }catch( const char* msg ) {
      args.GetReturnValue().Set(String::NewFromUtf8(isolate, "compat"));
    }
  }
}

void Initialize(Local<Object> exports) {
  NODE_SET_METHOD(exports, "detectCPU", Method);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

}
