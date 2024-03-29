using System;
using Newtonsoft.Json;

namespace battlemap.Models
{
	/* A token on the Battlemap */
	[JsonObject(MemberSerialization.Fields)]
	public class Token
	{
#region Fields
		/* The name that represents the Token on the battlemap */
		public string Name;
		/* The amount of spaces the token occupies.*/
		public int Width, Height;
		/* The coordinate of the token */
		public int X, Y;
		/* Bitvector for conditions */
		public int Conditions;
#endregion

#region Properties
		[JsonIgnore]
		public (int X, int Y) Position
		{
			get
				=> (X, Y);

			set
			{
				X = value.X;
				Y = value.Y;
			}
		}

		/* The size of the Token, as a Tuple */
		[JsonIgnore]
		public (int Width, int Height) Size
		{
			get
				=> (Width, Height);

			set
			{
				Width = value.Width;
				Height = value.Height;
			}
		}


		[JsonIgnore]
		public ((int X, int Y) pos, (int Width, int Height) siz) Hitbox
		{
			get
				=> (Position, Size);

			set
			{
				Position = value.pos;
				Size = value.siz;
			}
		}

#endregion

#region Contructors
		[JsonConstructor]
		public Token(string Name, int X, int Y, int Width, int Height, bool Hidden = false, int Conditions = 0)
		{
			if(Height <= 0)
				throw new ArgumentOutOfRangeException("h");
			if(Width <= 0)
				throw new ArgumentOutOfRangeException("w");

			this.Name = Name;
			this.X = X;
			this.Y = Y;
			this.Width = Width;
			this.Height = Height;
			this.Conditions = Conditions;

			if(Hidden)
				this.Conditions |= 1;
		}

		public Token(string name, int x, int y)
			: this(name, x, y, 1, 1)
		{}

		public Token(Token clone)
		{
			this.Name = clone.Name;
			this.X = clone.X;
			this.Y = clone.Y;
			this.Width = clone.Width;
			this.Height = clone.Height;
			this.Conditions = clone.Conditions;
		}
#endregion
	}
}