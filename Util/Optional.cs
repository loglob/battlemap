using System;

namespace battlemap.Util
{
    public struct Optional<T>
    {
		private T value;

		public T Value
			=> HasValue ? value : throw new Exception("Optional had no value!");

		public bool HasValue { get; }

		public static Optional<T> Empty
			=> new Optional<T>();

		public Optional(T value)
		{
			this.value = value;
			HasValue = true;
		}

		public static implicit operator Optional<T>(T v)
			=> new Optional<T>(v);

		public static implicit operator T(Optional<T> v)
			=> v.Value;
	}
}