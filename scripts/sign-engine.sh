#!/bin/bash

# Thư mục đích chứa Keystore nội bộ của Android
mkdir -p android/app
KEYSTORE_PATH="android/app/release.keystore"

# Nhận tham số loại key truyền vào (Mặc định là testkey nếu không truyền)
KEY_PROFILE="${1:-testkey}"

if [ -z "${KEYSTORE_BASE64}" ]; then
    echo "========================================================="
    echo "🌱 CHẾ ĐỘ MẶC ĐỊNH: Đang tự động đúc chuỗi khóa [$KEY_PROFILE]"
    echo "========================================================="
    
    # Phân loại cấu hình thông số theo chuẩn hệ thống (Giống cấu hình MT Manager)
    case $KEY_PROFILE in
      "testkey")
        DNAME="CN=Android Test, O=Android, C=US"
        ALIAS="android_test_alias"
        PASSWORD="android_test_password"
        ;;
      "platform")
        DNAME="CN=Android Platform, O=Android, C=US"
        ALIAS="android_platform_alias"
        PASSWORD="android_platform_password"
        ;;
      "shared")
        DNAME="CN=Android Shared, O=Android, C=US"
        ALIAS="android_shared_alias"
        PASSWORD="android_shared_password"
        ;;
      "media")
        DNAME="CN=Android Media, O=Android, C=US"
        ALIAS="android_media_alias"
        PASSWORD="android_media_password"
        ;;
      "editorkey")
        DNAME="CN=Editor Key, O=Custom, C=VN"
        ALIAS="android_editor_alias"
        PASSWORD="android_editor_password"
        ;;
      *)
        DNAME="CN=Starter Default, O=Universal, C=VN"
        ALIAS="android_default_alias"
        PASSWORD="android_default_password"
        ;;
    esac

    # Kích hoạt lõi Java đúc Keystore tương ứng trực tiếp trên RAM máy chủ
    keytool -genkeypair -v \
      -keystore $KEYSTORE_PATH \
      -alias $ALIAS \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -storepass $PASSWORD \
      -keypass $PASSWORD \
      -dname "$DNAME"
      
    # Đẩy thông tin biến môi trường ngược lại cho hệ thống GitHub Actions nhận diện
    echo "KEY_STORE_PASS=$PASSWORD" >> $GITHUB_ENV
    echo "KEY_ALIAS_NAME=$ALIAS" >> $GITHUB_ENV
    echo "BUILD_LOG_MODE=signed_default_${KEY_PROFILE}" >> $GITHUB_ENV

else
    echo "========================================================="
    echo "🔒 CHẾ ĐỘ CHUYÊN DỤNG: Phát hiện Chìa khóa Bí mật từ Secrets!"
    echo "========================================================="
    echo "${KEYSTORE_BASE64}" | base64 -d > $KEYSTORE_PATH
    
    echo "KEY_STORE_PASS=${KEYSTORE_PASSWORD}" >> $GITHUB_ENV
    echo "KEY_ALIAS_NAME=${KEY_ALIAS}" >> $GITHUB_ENV
    echo "BUILD_LOG_MODE=signed_custom" >> $GITHUB_ENV
fi
