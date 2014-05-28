# data-struct

Convert between JS object and Node.js buffer

```
{
	propname: DataTypes.uint
	propname2: [DataTypes.list, DataTypes.string]
	propname3: [{
		propname: [{
			propname: DataTypes.uint 
		}]
	propname4: [DataTypes.list, DataTypes.uint]
	}],
	propname5: [DataTypes.struct, {
		propname: propvalue
	}],
	propname6: [DataTypes.list, 
		{
			list: []
		}
	]
	
}


{
	propname: 42
	propname2: ['42','43','45']
	propname3: [
		{
				propname: [1,2,3]
		},
		{
				propname: [1,2,3]
		},
	],
	propname4: [ 
		[1,2,3],
		[1,2,3],
		[1,2,3]
	]
	
}
```
