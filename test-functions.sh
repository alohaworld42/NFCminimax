#!/bin/bash

# Simple Edge Function Test Script
# Tests the availability and basic functionality of all Edge Functions

echo "🧪 NFC Smart Home - Edge Functions Test"
echo "======================================="

SUPABASE_URL="https://jrchntonfshqvorcfvqh.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyY2hudG9uZnNocXZvcmNmdnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDIxNjQsImV4cCI6MjA3NzI3ODE2NH0.BHYdLFWuN92du_ahRRTGESoKlZrLvGqVMJet12ao9nQ"

# Function to test Edge Function
test_function() {
    local func_name=$1
    local method=$2
    local body=$3
    
    echo "Testing $func_name..."
    
    if [ -z "$body" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X OPTIONS \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            "$SUPABASE_URL/functions/v1/$func_name")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "$body" \
            "$SUPABASE_URL/functions/v1/$func_name")
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "405" ]; then
        echo "  ✅ $func_name: Available (HTTP $response)"
        return 0
    else
        echo "  ❌ $func_name: Error (HTTP $response)"
        return 1
    fi
}

echo ""
echo "🔍 Testing Edge Function Availability..."
echo ""

# Test all Edge Functions
functions=(
    "discover-hue-bridge"
    "create-hue-user"
    "execute-hue-action"
    "execute-meross-action"
    "authenticate-smartthings"
    "discover-smartthings-devices"
    "execute-smartthings-action"
    "authenticate-lsc"
    "discover-lsc-devices"
    "execute-lsc-action"
    "execute-samsung-app-action"
    "get-samsung-apps-list"
    "test-device-connection"
)

success_count=0
total_count=${#functions[@]}

for func in "${functions[@]}"; do
    if test_function "$func"; then
        ((success_count++))
    fi
done

echo ""
echo "📊 Test Results:"
echo "================"
echo "✅ Successful: $success_count/$total_count"
echo "❌ Failed: $((total_count - success_count))/$total_count"

if [ $success_count -eq $total_count ]; then
    echo ""
    echo "🎉 All Edge Functions are available!"
else
    echo ""
    echo "⚠️ Some Edge Functions may need attention"
fi

echo ""
echo "📝 Testing specific functionality..."

# Test device connection with mock data
echo "Testing device connection test function..."

mock_hue_request='{
    "deviceType": "hue_bridge",
    "connectionDetails": {
        "bridgeIp": "192.168.1.100",
        "username": "test-username"
    }
}'

response=$(curl -s -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "$mock_hue_request" \
    "$SUPABASE_URL/functions/v1/test-device-connection")

http_code="${response: -3}"
response_body="${response%???}"

if [ "$http_code" = "200" ]; then
    echo "  ✅ Device connection test: Working"
else
    echo "  ⚠️ Device connection test: HTTP $http_code"
    echo "  Response: $response_body"
fi

echo ""
echo "🏁 Test completed!"
