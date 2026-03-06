using System.Reflection;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MovieWeb.Serialization;

public sealed class EnumMemberJsonStringEnumConverter : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert)
    {
        return typeToConvert.IsEnum || (Nullable.GetUnderlyingType(typeToConvert)?.IsEnum ?? false);
    }

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        var underlyingType = Nullable.GetUnderlyingType(typeToConvert);
        if (underlyingType is not null)
        {
            var converterType = typeof(NullableEnumMemberConverter<>).MakeGenericType(underlyingType);
            return (JsonConverter)Activator.CreateInstance(converterType)!;
        }

        var enumConverterType = typeof(EnumMemberConverter<>).MakeGenericType(typeToConvert);
        return (JsonConverter)Activator.CreateInstance(enumConverterType)!;
    }

    private sealed class EnumMemberConverter<TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
    {
        private readonly Dictionary<TEnum, string> _valueToName;
        private readonly Dictionary<string, TEnum> _nameToValue;

        public EnumMemberConverter()
        {
            _valueToName = Enum.GetValues(typeof(TEnum))
                .Cast<TEnum>()
                .ToDictionary(e => e, GetEnumMemberValue);

            _nameToValue = _valueToName
                .GroupBy(kv => kv.Value, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().Key, StringComparer.OrdinalIgnoreCase);
        }

        public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return reader.TokenType switch
            {
                JsonTokenType.String => ReadString(ref reader),
                JsonTokenType.Number when reader.TryGetInt32(out var number) => (TEnum)Enum.ToObject(typeof(TEnum), number),
                _ => throw new JsonException($"Unable to convert token '{reader.TokenType}' to enum '{typeof(TEnum)}'.")
            };
        }

        public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
        {
            if (_valueToName.TryGetValue(value, out var stringValue))
            {
                writer.WriteStringValue(stringValue);
                return;
            }

            throw new JsonException($"Enum value '{value}' is not defined for type '{typeof(TEnum)}'.");
        }

        private TEnum ReadString(ref Utf8JsonReader reader)
        {
            var enumText = reader.GetString();
            if (enumText is not null && _nameToValue.TryGetValue(enumText, out var enumValue))
            {
                return enumValue;
            }

            throw new JsonException($"Unable to convert string '{enumText}' to enum '{typeof(TEnum)}'.");
        }

        private static string GetEnumMemberValue(TEnum value)
        {
            var member = typeof(TEnum).GetMember(value.ToString())?.FirstOrDefault();
            if (member is null)
            {
                return value.ToString();
            }

            var attribute = member.GetCustomAttribute<EnumMemberAttribute>(inherit: false);
            return attribute?.Value ?? value.ToString();
        }
    }

    private sealed class NullableEnumMemberConverter<TEnum> : JsonConverter<TEnum?> where TEnum : struct, Enum
    {
        private readonly EnumMemberConverter<TEnum> _innerConverter = new();

        public override TEnum? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }

            return _innerConverter.Read(ref reader, typeof(TEnum), options);
        }

        public override void Write(Utf8JsonWriter writer, TEnum? value, JsonSerializerOptions options)
        {
            if (value is null)
            {
                writer.WriteNullValue();
                return;
            }

            _innerConverter.Write(writer, value.Value, options);
        }
    }
}
