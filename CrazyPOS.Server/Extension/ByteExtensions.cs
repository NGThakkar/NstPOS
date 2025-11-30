namespace CrazyPOS.Server.Extension
{
    public static class ByteExtensions
    {
        public static string ToBase64(this byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0)
                return string.Empty;

            return Convert.ToBase64String(bytes);
        }
    }
}
